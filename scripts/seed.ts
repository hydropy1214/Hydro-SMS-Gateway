/**
 * Seed script — inserts default admin and operator accounts.
 * Run with: pnpm --filter @workspace/scripts run seed
 *
 * Uses ON CONFLICT DO NOTHING so it is safe to run multiple times.
 */
import crypto from "node:crypto";
import { db, usersTable } from "@workspace/db";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function seed() {
  const users = [
    {
      name: "Admin",
      email: "admin@hydropy.io",
      passwordHash: hashPassword("admin123"),
      role: "admin" as const,
    },
    {
      name: "Operator",
      email: "operator@hydropy.io",
      passwordHash: hashPassword("operator123"),
      role: "operator" as const,
    },
  ];

  for (const user of users) {
    const [row] = await db
      .insert(usersTable)
      .values(user)
      .onConflictDoNothing()
      .returning({ id: usersTable.id, email: usersTable.email });

    if (row) {
      console.log(`✓ Created user: ${row.email} (id=${row.id})`);
    } else {
      console.log(`  Already exists: ${user.email}`);
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
