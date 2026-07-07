import { Router } from "express";
import { db, devicesTable, campaignsTable, messagesTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

/** GET /api/stats/dashboard */
router.get("/stats/dashboard", requireAuth, async (req, res) => {
  const [
    devicesResult,
    onlineResult,
    activeCampaignsResult,
    sentResult,
    failedResult,
    queuedResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(devicesTable),
    db
      .select({ count: sql<number>`count(*)` })
      .from(devicesTable)
      .where(sql`${devicesTable.status} IN ('ONLINE', 'BUSY')`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(campaignsTable)
      .where(sql`${campaignsTable.status} IN ('RUNNING', 'SCHEDULED')`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(sql`${messagesTable.status} IN ('SENT', 'DELIVERED')`),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(eq(messagesTable.status, "FAILED")),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable)
      .where(
        sql`${messagesTable.status} IN ('CREATED', 'QUEUED', 'ASSIGNED', 'SENDING')`,
      ),
  ]);

  res.json({
    totalDevices: Number(devicesResult[0]?.count ?? 0),
    onlineDevices: Number(onlineResult[0]?.count ?? 0),
    activeCampaigns: Number(activeCampaignsResult[0]?.count ?? 0),
    totalMessagesSent: Number(sentResult[0]?.count ?? 0),
    totalMessagesFailed: Number(failedResult[0]?.count ?? 0),
    totalMessagesQueued: Number(queuedResult[0]?.count ?? 0),
  });
});

/** GET /api/stats/messages-over-time */
router.get("/stats/messages-over-time", requireAuth, async (req, res) => {
  const rows = await db.execute(sql`
    WITH days AS (
      SELECT generate_series(
        (CURRENT_DATE - INTERVAL '6 days')::date,
        CURRENT_DATE::date,
        '1 day'::interval
      )::date AS day
    )
    SELECT
      to_char(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(SUM(CASE WHEN m.status IN ('SENT','DELIVERED') THEN 1 ELSE 0 END), 0)::int AS sent,
      COALESCE(SUM(CASE WHEN m.status = 'FAILED' THEN 1 ELSE 0 END), 0)::int AS failed
    FROM days
    LEFT JOIN messages m ON DATE(m.created_at) = days.day
    GROUP BY days.day
    ORDER BY days.day
  `);

  res.json(rows.rows ?? rows);
});

export default router;
