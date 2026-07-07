import { Router } from "express";
import { db, devicesTable, simCardsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "../lib/auth";
import { broadcast } from "../lib/websocket";

const router = Router();

function generateDeviceToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function buildQrData(deviceId: number, token: string): string {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  const fallback = process.env.SERVER_URL ?? "http://localhost:3000";
  const serverUrl = domain ? `wss://${domain}/api/ws` : fallback;
  return JSON.stringify({ serverUrl, deviceId, token });
}

/** GET /api/devices */
router.get("/devices", requireAuth, async (req, res) => {
  const { status } = req.query;
  const rows = await db
    .select()
    .from(devicesTable)
    .where(
      status
        ? sql`${devicesTable.status} = ${status}`
        : undefined,
    );
  res.json(rows);
});

/** POST /api/devices */
router.post("/devices", requireAuth, async (req, res) => {
  const schema = z.object({ deviceName: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const token = generateDeviceToken();
  const [device] = await db
    .insert(devicesTable)
    .values({
      deviceName: parsed.data.deviceName,
      deviceToken: token,
      status: "PENDING_CONNECTION",
    })
    .returning();

  res.status(201).json({ ...device, qrData: buildQrData(device.id, token) });
});

/** GET /api/devices/:deviceId */
router.get("/devices/:deviceId", requireAuth, async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId))
    .limit(1);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  res.json(device);
});

/** DELETE /api/devices/:deviceId */
router.delete("/devices/:deviceId", requireAuth, async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  await db.delete(devicesTable).where(eq(devicesTable.id, deviceId));
  res.json({ success: true, message: "Device deleted" });
});

/** POST /api/devices/:deviceId/disconnect */
router.post("/devices/:deviceId/disconnect", requireAuth, async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  const [device] = await db
    .update(devicesTable)
    .set({ status: "OFFLINE" })
    .where(eq(devicesTable.id, deviceId))
    .returning();

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  broadcast({ type: "device.offline", deviceId });
  res.json(device);
});

/** GET /api/devices/:deviceId/qr */
router.get("/devices/:deviceId/qr", requireAuth, async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.id, deviceId))
    .limit(1);

  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  let token = device.deviceToken;
  if (!token) {
    token = generateDeviceToken();
    await db
      .update(devicesTable)
      .set({ deviceToken: token })
      .where(eq(devicesTable.id, deviceId));
  }

  res.json({ deviceId, qrData: buildQrData(deviceId, token), token });
});

/** GET /api/devices/:deviceId/simcards */
router.get("/devices/:deviceId/simcards", requireAuth, async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  const rows = await db
    .select()
    .from(simCardsTable)
    .where(eq(simCardsTable.deviceId, deviceId));
  res.json(rows);
});

export default router;
