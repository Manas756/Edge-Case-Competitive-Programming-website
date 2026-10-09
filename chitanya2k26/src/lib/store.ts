// JSON-file repository. Every read/write goes through getDb()/save(), so replacing this module
// with a Postgres/Prisma implementation does not touch the rest of the app.
import fs from "node:fs";
import path from "node:path";
import type { Database } from "./types";
import { buildSeed } from "./seed";

const g = globalThis as unknown as { __c26db?: Database };
const file = () => path.resolve(process.cwd(), process.env.DATA_FILE || "./data/db.json");

export function getDb(): Database {
  if (g.__c26db) return g.__c26db;
  const f = file();
  try {
    g.__c26db = JSON.parse(fs.readFileSync(f, "utf8")) as Database;
  } catch {
    g.__c26db = buildSeed();
    save();
  }
  return g.__c26db!;
}

let saveTimer: NodeJS.Timeout | null = null;

function flushSync() {
  if (!g.__c26db) return;
  const f = file();
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(g.__c26db, null, 1));
  fs.renameSync(tmp, f);
}

export function save(immediate = false) {
  if (!g.__c26db) return;
  if (immediate) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    flushSync();
    return;
  }
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        flushSync();
      } catch (e) {
        console.error("Failed to save db:", e);
      }
    }, 250);
  }
}

export function resetDb() {
  g.__c26db = buildSeed();
  save(true);
}

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
