import { db, messagesTable, campaignsTable, devicesTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { sendToDevice, getOnlineDeviceIds, broadcast } from "./websocket";
import { logger } from "./logger";

/**
 * Pick best available online devices based on battery and signal.
 */
async function selectBestDevices(limit: number): Promise<number[]> {
  const onlineIds = getOnlineDeviceIds();
  if (onlineIds.length === 0) return [];

  const devices = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(inArray(devicesTable.id, onlineIds))
    .orderBy(
      sql`COALESCE(${devicesTable.battery}, 50) DESC`,
      sql`COALESCE(${devicesTable.signal}, 50) DESC`,
    )
    .limit(limit);

  return devices.map((d) => d.id);
}

/**
 * Dispatch queued messages from a campaign to available online devices.
 */
export async function enqueueMessages(campaignId: number): Promise<void> {
  try {
    const queued = await db
      .select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.campaignId, campaignId),
          eq(messagesTable.status, "QUEUED"),
        ),
      )
      .limit(50);

    if (queued.length === 0) return;

    const deviceIds = await selectBestDevices(5);
    if (deviceIds.length === 0) {
      logger.warn({ campaignId }, "No online devices to assign messages to");
      return;
    }

    let deviceIndex = 0;
    const assignments: Array<{ messageId: number; deviceId: number }> = [];

    for (const message of queued) {
      const deviceId = deviceIds[deviceIndex % deviceIds.length];
      deviceIndex++;

      const sent = sendToDevice(deviceId, {
        type: "sms.new",
        messageId: message.id,
        phone: message.recipient,
        text: message.message,
      });

      if (sent) {
        assignments.push({ messageId: message.id, deviceId });
        broadcast({ type: "sms.new", messageId: message.id, deviceId });
      }
    }

    // Batch-update assigned messages
    for (const { messageId, deviceId } of assignments) {
      await db
        .update(messagesTable)
        .set({ status: "ASSIGNED", deviceId })
        .where(eq(messagesTable.id, messageId));
    }

    logger.info(
      { campaignId, assigned: assignments.length },
      "Messages assigned to devices",
    );
  } catch (err) {
    logger.error({ err, campaignId }, "Error in enqueueMessages");
  }
}

/** Periodically try to dispatch queued messages for running campaigns */
export function startScheduler(): void {
  setInterval(async () => {
    try {
      const running = await db
        .select({ id: campaignsTable.id })
        .from(campaignsTable)
        .where(eq(campaignsTable.status, "RUNNING"));

      for (const { id } of running) {
        await enqueueMessages(id);
      }
    } catch {
      // scheduler silently retries
    }
  }, 10_000);
}
