import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { normalizePhone } from "../utils/phone.ts";

const DB_PATH = process.env.DB_PATH ?? "./data/zapnotif.db";

export interface AllowedNumberRow {
  phone: string;
  label: string | null;
  created_at: string;
}

/**
 * Allowlist of recipient phone numbers.
 * Empty list = sending allowed to anyone (open mode).
 */
export class AllowlistStore {
  private db: Database;

  constructor() {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    this.db = new Database(DB_PATH, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS allowed_numbers (
        phone TEXT PRIMARY KEY,
        label TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  list(): AllowedNumberRow[] {
    return this.db
      .query("SELECT * FROM allowed_numbers ORDER BY created_at DESC")
      .all() as AllowedNumberRow[];
  }

  size(): number {
    const { n } = this.db.query("SELECT COUNT(*) AS n FROM allowed_numbers").get() as { n: number };
    return n;
  }

  add(phone: string, label: string | null): AllowedNumberRow {
    const normalized = normalizePhone(phone);
    this.db
      .query("INSERT OR REPLACE INTO allowed_numbers (phone, label, created_at) VALUES (?, ?, ?)")
      .run(normalized, label, new Date().toISOString());
    return { phone: normalized, label, created_at: new Date().toISOString() };
  }

  remove(phone: string): boolean {
    const changes = this.db
      .query("DELETE FROM allowed_numbers WHERE phone = ?")
      .run(normalizePhone(phone));
    return changes.changes > 0;
  }

  /** True when the allowlist is empty (open mode) or contains the number. */
  isAllowed(phone: string): boolean {
    if (this.size() === 0) return true;
    const row = this.db
      .query("SELECT phone FROM allowed_numbers WHERE phone = ?")
      .get(normalizePhone(phone)) as { phone: string } | null;
    return row !== null;
  }
}
