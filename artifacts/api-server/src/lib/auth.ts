import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, lt } from "drizzle-orm";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Create a persistent session in the database. Returns the session token. */
export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

/** Remove a session from the database. */
export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

/** Resolve a session token to a userId, or undefined if invalid/expired. */
async function resolveSession(token: string): Promise<number | undefined> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);

  if (!session) return undefined;

  if (session.expiresAt < new Date()) {
    // Expired — clean it up
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return undefined;
  }

  return session.userId;
}

/** Purge all expired sessions. Call periodically to keep the table tidy. */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "").trim() ?? "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = await resolveSession(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired session — please log in again" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).user = user;
  next();
}
