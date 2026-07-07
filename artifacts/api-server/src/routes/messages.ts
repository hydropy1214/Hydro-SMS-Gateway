import { Router } from "express";
import { db, messagesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/** GET /api/messages */
router.get("/messages", requireAuth, async (req, res) => {
  const { campaignId, deviceId, status, limit = "50", offset = "0" } = req.query;

  const conditions = [];
  if (campaignId) conditions.push(eq(messagesTable.campaignId, Number(campaignId)));
  if (deviceId) conditions.push(eq(messagesTable.deviceId, Number(deviceId)));
  if (status) conditions.push(sql`${messagesTable.status} = ${status}`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [messages, countResult] = await Promise.all([
    db
      .select()
      .from(messagesTable)
      .where(where)
      .orderBy(sql`${messagesTable.createdAt} DESC`)
      .limit(Number(limit))
      .offset(Number(offset)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(where),
  ]);

  res.json({
    messages,
    total: Number(countResult[0]?.count ?? 0),
  });
});

/** GET /api/messages/:messageId */
router.get("/messages/:messageId", requireAuth, async (req, res) => {
  const messageId = Number(req.params.messageId);
  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId))
    .limit(1);

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  res.json(message);
});

export default router;
