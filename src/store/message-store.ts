import { Database, type SQLQueryBindings } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface MessageRow {
  id: string;
  request_id: string;
  template_id: string | null;
  template_name: string | null;
  recipient_phone: string;
  recipient_name: string | null;
  provider_message_id: string | null;
  status: "sent" | "failed";
  error: string | null;
  created_at: string;
}

export interface ListMessagesOptions {
  page: number;
  pageSize: number;
  phone?: string | undefined;
  status?: "sent" | "failed" | undefined;
}

export interface MessageStats {
  totalSent: number;
  totalFailed: number;
  sentToday: number;
  successRate: number;
  last14Days: { date: string; sent: number; failed: number }[];
}

const DB_PATH = process.env.DB_PATH ?? "./data/zapnotif.db";

export class MessageStore {
  private db: Database;

  constructor() {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    this.db = new Database(DB_PATH, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        request_id TEXT,
        template_id TEXT,
        template_name TEXT,
        recipient_phone TEXT NOT NULL,
        recipient_name TEXT,
        provider_message_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('sent','failed')),
        error TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_phone ON messages(recipient_phone);
      CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    `);
  }

  insert(row: Omit<MessageRow, "id">): void {
    this.db
      .query(
        `INSERT INTO messages (id, request_id, template_id, template_name, recipient_phone,
          recipient_name, provider_message_id, status, error, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        row.request_id,
        row.template_id,
        row.template_name,
        row.recipient_phone,
        row.recipient_name,
        row.provider_message_id,
        row.status,
        row.error,
        row.created_at,
      );
  }

  list(opts: ListMessagesOptions): { items: MessageRow[]; total: number; page: number; pageSize: number } {
    const where: string[] = [];
    const params: SQLQueryBindings[] = [];
    if (opts.phone) {
      where.push("recipient_phone LIKE ?");
      params.push(`%${opts.phone}%`);
    }
    if (opts.status) {
      where.push("status = ?");
      params.push(opts.status);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const { total } = this.db
      .query(`SELECT COUNT(*) AS total FROM messages ${whereSql}`)
      .get(...params) as { total: number };

    const args: SQLQueryBindings[] = [...params, opts.pageSize, (opts.page - 1) * opts.pageSize];
    const items = this.db
      .query(`SELECT * FROM messages ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .all(...args) as MessageRow[];

    return { items, total, page: opts.page, pageSize: opts.pageSize };
  }

  stats(): MessageStats {
    const totals = this.db
      .query(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END), 0) AS sent,
           COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failed,
           COALESCE(SUM(CASE WHEN status = 'sent' AND date(created_at) = date('now', 'localtime') THEN 1 ELSE 0 END), 0) AS sentToday
         FROM messages`,
      )
      .get() as { sent: number; failed: number; sentToday: number };

    const rows = this.db
      .query(
        `SELECT date(created_at, 'localtime') AS date,
           SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
         FROM messages
         WHERE created_at >= datetime('now', 'localtime', '-13 days', 'start of day')
         GROUP BY date(created_at, 'localtime')`,
      )
      .all() as { date: string; sent: number; failed: number }[];

    const byDate = new Map(rows.map((r) => [r.date, r]));
    const last14Days: MessageStats["last14Days"] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const row = byDate.get(key);
      last14Days.push({ date: key, sent: row?.sent ?? 0, failed: row?.failed ?? 0 });
    }

    const attempted = totals.sent + totals.failed;
    return {
      totalSent: totals.sent,
      totalFailed: totals.failed,
      sentToday: totals.sentToday,
      successRate: attempted === 0 ? 100 : Math.round((totals.sent / attempted) * 100),
      last14Days,
    };
  }
}
