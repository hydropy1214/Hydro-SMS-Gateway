import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Simple in-memory session store: token → userId */
const sessions = new Map<string, number>();

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function createSession(userId: number): string {
  const token = generateToken();
  sessions.set(token, userId);
  return token;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function getSessionUserId(token: string): number | undefined {
  return sessions.get(token);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") ?? "";

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = getSessionUserId(token);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired token" });
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
