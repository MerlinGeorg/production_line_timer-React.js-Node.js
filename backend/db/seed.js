// db/seed.js
import "dotenv/config";
import { getDb } from "./init.js";

const BUILDS = [
  { build_number: "BLD-001", num_parts: 5, time_per_part: 1 },
  { build_number: "BLD-002", num_parts: 10, time_per_part: 1 },
  { build_number: "BLD-003", num_parts: 5, time_per_part: 5 },
  { build_number: "BLD-004", num_parts: 15, time_per_part: 4 },
  { build_number: "BLD-005", num_parts: 20, time_per_part: 1 },
  { build_number: "123456", num_parts: 25, time_per_part: 2 },
];

const db = await getDb();

for (const row of BUILDS) {
  await db.run(
    `INSERT OR IGNORE INTO builds (build_number, num_parts, time_per_part)
     VALUES (?, ?, ?)`,
    [row.build_number, row.num_parts, row.time_per_part]
  );
}

console.log("Seed complete:");

const rows = await db.all("SELECT * FROM builds");
console.table(rows);

await db.close();