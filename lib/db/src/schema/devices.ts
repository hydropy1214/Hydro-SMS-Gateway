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
import { usersTable } from "./users";

export const deviceStatusEnum = pgEnum("device_status", [
  "NEW",
  "PENDING_CONNECTION",
  "CONNECTED",
  "ONLINE",
  "BUSY",
  "OFFLINE",
  "BLOCKED",
]);

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  deviceName: text("device_name").notNull(),
  deviceToken: text("device_token").unique(),
  status: deviceStatusEnum("status").notNull().default("NEW"),
  androidVersion: text("android_version"),
  model: text("model"),
  appVersion: text("app_version"),
  battery: integer("battery"),
  signal: integer("signal"),
  lastHeartbeat: timestamp("last_heartbeat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
