// Deletes the JSON data file so the demo data is re-seeded on the next server start.
import fs from "node:fs";
import path from "node:path";
const file = path.resolve(process.cwd(), process.env.DATA_FILE || "./data/db.json");
fs.rmSync(file, { force: true });
console.log(`Removed ${file}. Restart the server to load fresh demo data.`);
