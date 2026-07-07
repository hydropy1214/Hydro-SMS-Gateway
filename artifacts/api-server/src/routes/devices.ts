import { Router, type Request } from "express";
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

function buildQrData(req: Request, deviceId: number, token: string): string {
  // Priority order (most trusted first):
  // 1. SERVER_URL env var — set this in production for a canonical origin
  // 2. REPLIT_DEV_DOMAIN — auto-set by Replit in development
  // 3. Request host header — last resort; only used if nothing else is configured
  if (process.env.SERVER_URL) {
    const base = process.env.SERVER_URL.replace(/\/$/, "");
    return JSON.stringify({ serverUrl: base, deviceId, token });
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return JSON.stringify({ serverUrl: `https://${devDomain}`, deviceId, token });
  }
  // Fallback: derive from request — reliable only behind a trusted reverse proxy
  const host = (req.headers["x-forwarded-host"] || req.headers.host) as string;
  const proto = ((req.headers["x-forwarded-proto"] as string) ?? "https")
    .split(",")[0]
    .trim();
  return JSON.stringify({ serverUrl: `${proto}://${host}`, deviceId, token });
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

  res.status(201).json({ ...device, qrData: buildQrData(req, device.id, token) });
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

  res.json({ deviceId, qrData: buildQrData(req, deviceId, token), token });
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
