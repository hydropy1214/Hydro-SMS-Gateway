import { Router } from "express";
import { db, messagesTable } from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";

const router = Router();

/** GET /api/messages */
router.get("/messages", requireAuth, async (req, res) => {
  const { campaignId, deviceId, status, limit = "100", offset = "0" } = req.query;

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

/** DELETE /api/messages
 *  Bulk delete messages. Body: { ids?: number[]; campaignId?: number; status?: string }
 *  If nothing specified → deletes all messages (logs clear).
 */
router.delete("/messages", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      ids: z.array(z.number()).optional(),
      campaignId: z.number().optional(),
      status: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const { ids, campaignId, status } = parsed.data;
    const conditions = [];

    if (ids && ids.length > 0) {
      conditions.push(inArray(messagesTable.id, ids));
    }
    if (campaignId !== undefined) {
      conditions.push(eq(messagesTable.campaignId, campaignId));
    }
    if (status) {
      conditions.push(sql`${messagesTable.status} = ${status}`);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const deleted = await db.delete(messagesTable).where(where).returning({ id: messagesTable.id });

    res.json({ success: true, deleted: deleted.length });
  } catch (err) {
    req.log.error({ err }, "deleteMessages error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
