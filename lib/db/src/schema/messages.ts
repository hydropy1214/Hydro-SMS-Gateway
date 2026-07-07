import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { devicesTable } from "./devices";

export const messageStatusEnum = pgEnum("message_status", [
  "CREATED",
  "QUEUED",
  "ASSIGNED",
  "SENDING",
  "SENT",
  "FAILED",
  "DELIVERED",
]);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => campaignsTable.id, {
    onDelete: "set null",
  }),
  deviceId: integer("device_id").references(() => devicesTable.id, {
    onDelete: "set null",
  }),
  recipient: text("recipient").notNull(),
  message: text("message").notNull(),
  status: messageStatusEnum("status").notNull().default("CREATED"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
