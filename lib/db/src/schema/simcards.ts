import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { devicesTable } from "./devices";

export const simStatusEnum = pgEnum("sim_status", [
  "ACTIVE",
  "INACTIVE",
  "UNKNOWN",
]);

export const simCardsTable = pgTable("sim_cards", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id")
    .notNull()
    .references(() => devicesTable.id, { onDelete: "cascade" }),
  slot: integer("slot").notNull().default(0),
  carrier: text("carrier"),
  phoneNumber: text("phone_number"),
  status: simStatusEnum("status").notNull().default("UNKNOWN"),
});

export const insertSimCardSchema = createInsertSchema(simCardsTable).omit({
  id: true,
});

export type InsertSimCard = z.infer<typeof insertSimCardSchema>;
export type SimCard = typeof simCardsTable.$inferSelect;
