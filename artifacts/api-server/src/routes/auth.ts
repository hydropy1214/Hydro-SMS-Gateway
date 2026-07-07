import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, createSession, destroySession, requireAuth } from "../lib/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { email, password } = parsed.data as { email: string; password: string };
  const hash = hashPassword(password);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, String(email)))
    .limit(1);

  if (!user || user.passwordHash !== hash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = createSession(user.id);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
    token,
  });
});

router.post("/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") ?? "";
  destroySession(token);
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = (req as any).user as {
    id: number;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  };
  res.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  });
});

export default router;
