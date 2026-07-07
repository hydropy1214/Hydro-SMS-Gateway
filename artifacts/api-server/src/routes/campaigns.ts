import { Router } from "express";
import {
  db,
  campaignsTable,
  contactsTable,
  messagesTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../lib/auth";
import { broadcast } from "../lib/websocket";
import { enqueueMessages } from "../lib/scheduler";

const router = Router();

/** GET /api/campaigns */
router.get("/campaigns", requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await db
      .select()
      .from(campaignsTable)
      .where(
        status ? sql`${campaignsTable.status} = ${status}` : undefined,
      )
      .orderBy(sql`${campaignsTable.createdAt} DESC`);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listCampaigns error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/campaigns */
router.post("/campaigns", requireAuth, async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      messageTemplate: z.string().min(1),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const [campaign] = await db
      .insert(campaignsTable)
      .values({
        name: parsed.data.name,
        messageTemplate: parsed.data.messageTemplate,
        status: "DRAFT",
      })
      .returning();

    res.status(201).json(campaign);
  } catch (err) {
    req.log.error({ err }, "createCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/campaigns/:campaignId */
router.get("/campaigns/:campaignId", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json(campaign);
  } catch (err) {
    req.log.error({ err }, "getCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/campaigns/:campaignId */
router.delete("/campaigns/:campaignId", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }
    await db.delete(campaignsTable).where(eq(campaignsTable.id, campaignId));
    res.json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    req.log.error({ err }, "deleteCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/campaigns/:campaignId/start */
router.post("/campaigns/:campaignId/start", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    // Load contacts that don't yet have corresponding messages
    const contacts = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.campaignId, campaignId));

    if (contacts.length > 0) {
      // Check how many messages already exist to avoid duplicates
      const existingResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messagesTable)
        .where(eq(messagesTable.campaignId, campaignId));
      const existingCount = Number(existingResult[0]?.count ?? 0);

      if (existingCount < contacts.length) {
        // Only insert missing messages (contacts whose phone numbers have no message yet)
        const existingRecipients = existingCount > 0
          ? (await db.select({ recipient: messagesTable.recipient }).from(messagesTable).where(eq(messagesTable.campaignId, campaignId))).map(r => r.recipient)
          : [];
        const existingSet = new Set(existingRecipients);

        const newMessages = contacts
          .filter(c => !existingSet.has(c.phoneNumber))
          .map(c => ({
            campaignId,
            recipient: c.phoneNumber,
            message: campaign.messageTemplate.replace("{name}", c.name ?? c.phoneNumber),
            status: "QUEUED" as const,
          }));

        if (newMessages.length > 0) {
          await db.insert(messagesTable).values(newMessages);
          // Update totalMessages to match contacts
          await db
            .update(campaignsTable)
            .set({ totalMessages: contacts.length })
            .where(eq(campaignsTable.id, campaignId));
        }
      }
    }

    const [updated] = await db
      .update(campaignsTable)
      .set({ status: "RUNNING" })
      .where(eq(campaignsTable.id, campaignId))
      .returning();

    broadcast({ type: "campaign.started", campaignId });
    // Fire-and-forget dispatch (scheduler handles retries)
    enqueueMessages(campaignId).catch(() => undefined);

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "startCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/campaigns/:campaignId/pause */
router.post("/campaigns/:campaignId/pause", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }
    const [updated] = await db
      .update(campaignsTable)
      .set({ status: "PAUSED" })
      .where(eq(campaignsTable.id, campaignId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "pauseCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/campaigns/:campaignId/resume */
router.post("/campaigns/:campaignId/resume", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }
    const [updated] = await db
      .update(campaignsTable)
      .set({ status: "RUNNING" })
      .where(eq(campaignsTable.id, campaignId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    broadcast({ type: "campaign.started", campaignId });
    enqueueMessages(campaignId).catch(() => undefined);

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "resumeCampaign error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/campaigns/:campaignId/contacts */
router.get("/campaigns/:campaignId/contacts", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }
    const rows = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.campaignId, campaignId));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "listContacts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/campaigns/:campaignId/contacts */
router.post("/campaigns/:campaignId/contacts", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }

    const schema = z.object({
      contacts: z.array(
        z.object({
          phoneNumber: z.string().min(1),
          name: z.string().optional(),
        }),
      ),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }

    const incoming = parsed.data.contacts;

    // Get existing phone numbers for dedup
    const existing = await db
      .select({ phoneNumber: contactsTable.phoneNumber })
      .from(contactsTable)
      .where(eq(contactsTable.campaignId, campaignId));

    const existingSet = new Set(existing.map((e) => e.phoneNumber));

    const phoneRegex = /^\+?[\d\s\-().]{7,15}$/;
    const seen = new Set<string>();
    let duplicatesRemoved = 0;
    let invalid = 0;
    const validContacts: { campaignId: number; phoneNumber: string; name?: string }[] = [];

    for (const c of incoming) {
      const clean = c.phoneNumber.trim();
      if (!phoneRegex.test(clean)) {
        invalid++;
        continue;
      }
      if (existingSet.has(clean) || seen.has(clean)) {
        duplicatesRemoved++;
        continue;
      }
      seen.add(clean);
      validContacts.push({ campaignId, phoneNumber: clean, name: c.name });
    }

    if (validContacts.length > 0) {
      await db.insert(contactsTable).values(validContacts);
      // totalMessages is updated when campaign starts, not at import time
      // so operators can add contacts before starting
    }

    res.status(201).json({
      imported: validContacts.length,
      duplicatesRemoved,
      invalid,
    });
  } catch (err) {
    req.log.error({ err }, "importContacts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/campaigns/:campaignId/report */
router.get("/campaigns/:campaignId/report", requireAuth, async (req, res) => {
  try {
    const campaignId = Number(req.params.campaignId);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }
    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, campaignId))
      .limit(1);

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.campaignId, campaignId))
      .limit(200);

    const sent = messages.filter((m) => m.status === "SENT" || m.status === "DELIVERED").length;
    const failed = messages.filter((m) => m.status === "FAILED").length;
    const queued = messages.filter((m) =>
      ["CREATED", "QUEUED", "ASSIGNED", "SENDING"].includes(m.status),
    ).length;
    const successRate =
      campaign.totalMessages > 0 ? (sent / campaign.totalMessages) * 100 : 0;

    res.json({ campaign, sent, failed, queued, successRate, messages });
  } catch (err) {
    req.log.error({ err }, "getCampaignReport error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
