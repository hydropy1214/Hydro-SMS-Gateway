import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { db, devicesTable, messagesTable, campaignsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

type DeviceClient = {
  ws: WebSocket;
  deviceId: number;
};

const deviceClients = new Map<number, DeviceClient>();
const dashboardClients = new Set<WebSocket>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type") ?? "dashboard";

    if (type === "device" && token) {
      handleDeviceConnection(ws, token).catch((err) => {
        logger.error({ err }, "Device connection setup error");
        ws.close(4002, "Connection error");
      });
    } else {
      handleDashboardConnection(ws);
    }

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  logger.info("WebSocket server initialized");
}

async function handleDeviceConnection(ws: WebSocket, token: string): Promise<void> {
  const [device] = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.deviceToken, token))
    .limit(1);

  if (!device) {
    ws.close(4001, "Invalid token");
    return;
  }

  await db
    .update(devicesTable)
    .set({ status: "ONLINE", lastHeartbeat: new Date() })
    .where(eq(devicesTable.id, device.id));

  deviceClients.set(device.id, { ws, deviceId: device.id });
  broadcast({ type: "device.connected", deviceId: device.id });

  logger.info({ deviceId: device.id }, "Device connected via WebSocket");

  ws.on("message", (data) => {
    handleDeviceMessage(device.id, data.toString()).catch((err) => {
      logger.error({ err, deviceId: device.id }, "Device message handling error");
    });
  });

  ws.on("close", () => {
    deviceClients.delete(device.id);
    db.update(devicesTable)
      .set({ status: "OFFLINE" })
      .where(eq(devicesTable.id, device.id))
      .catch((err) => logger.error({ err }, "Error setting device offline on close"));
    broadcast({ type: "device.offline", deviceId: device.id });
    logger.info({ deviceId: device.id }, "Device disconnected");
  });
}

async function handleDeviceMessage(deviceId: number, raw: string): Promise<void> {
  let msg: { type: string; [key: string]: unknown };
  try {
    msg = JSON.parse(raw) as { type: string; [key: string]: unknown };
  } catch {
    logger.warn({ deviceId }, "Received malformed JSON from device");
    return;
  }

  if (msg.type === "heartbeat") {
    const battery = typeof msg.battery === "number" ? msg.battery : undefined;
    const signal = typeof msg.signal === "number" ? msg.signal : undefined;
    const androidVersion = typeof msg.androidVersion === "string" ? msg.androidVersion : undefined;
    const model = typeof msg.model === "string" ? msg.model : undefined;
    const appVersion = typeof msg.appVersion === "string" ? msg.appVersion : undefined;

    await db
      .update(devicesTable)
      .set({ battery, signal, androidVersion, model, appVersion, lastHeartbeat: new Date(), status: "ONLINE" })
      .where(eq(devicesTable.id, deviceId));

    broadcast({ type: "device.heartbeat", deviceId, battery, signal });
    return;
  }

  if (msg.type === "sms.result") {
    const messageId = typeof msg.messageId === "number" ? msg.messageId : undefined;
    if (!messageId) return;

    const status = msg.status === "SENT" ? "SENT" as const : "FAILED" as const;
    const failureReason =
      status === "FAILED" && typeof msg.reason === "string" ? msg.reason : null;

    await db
      .update(messagesTable)
      .set({
        status,
        failureReason,
        sentAt: status === "SENT" ? new Date() : undefined,
        deviceId,
      })
      .where(eq(messagesTable.id, messageId));

    // Update campaign counters
    const [message] = await db
      .select({ campaignId: messagesTable.campaignId })
      .from(messagesTable)
      .where(eq(messagesTable.id, messageId))
      .limit(1);

    if (message?.campaignId) {
      const campaignId = message.campaignId;
      if (status === "SENT") {
        await db
          .update(campaignsTable)
          .set({ sent: sql`${campaignsTable.sent} + 1` })
          .where(eq(campaignsTable.id, campaignId));
      } else {
        await db
          .update(campaignsTable)
          .set({ failed: sql`${campaignsTable.failed} + 1` })
          .where(eq(campaignsTable.id, campaignId));
      }

      // Check completion
      const [campaign] = await db
        .select()
        .from(campaignsTable)
        .where(eq(campaignsTable.id, campaignId))
        .limit(1);

      if (
        campaign &&
        campaign.totalMessages > 0 &&
        campaign.sent + campaign.failed >= campaign.totalMessages
      ) {
        await db
          .update(campaignsTable)
          .set({ status: "COMPLETED" })
          .where(eq(campaignsTable.id, campaignId));
        broadcast({ type: "campaign.completed", campaignId });
      }
    }

    broadcast({
      type: status === "SENT" ? "sms.sent" : "sms.failed",
      messageId,
      deviceId,
    });
  }
}

function handleDashboardConnection(ws: WebSocket): void {
  dashboardClients.add(ws);
  ws.on("close", () => {
    dashboardClients.delete(ws);
  });
}

export function broadcast(event: Record<string, unknown>): void {
  const payload = JSON.stringify(event);
  for (const client of dashboardClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function sendToDevice(deviceId: number, data: Record<string, unknown>): boolean {
  const client = deviceClients.get(deviceId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

export function getOnlineDeviceIds(): number[] {
  return Array.from(deviceClients.keys());
}
