import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Same statements as db/schema.sql. Read at runtime on Node; embedded fallback for the Worker bundle. */
const EMBEDDED = `
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS shops_email_idx ON shops (email);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_shop_idx ON sessions (shop_id);
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS customers_shop_idx ON customers (shop_id);
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('udhaar', 'payment')),
  amount INTEGER NOT NULL,
  note TEXT,
  running_balance INTEGER NOT NULL,
  transcript TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_shop_idx ON entries (shop_id, type, created_at);
CREATE TABLE IF NOT EXISTS shop_records (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rent', 'bill')),
  status TEXT NOT NULL CHECK (status IN ('due', 'paid')),
  amount INTEGER NOT NULL,
  label TEXT NOT NULL,
  bill_kind TEXT,
  party TEXT,
  period TEXT,
  note TEXT,
  transcript TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS shop_records_shop_idx ON shop_records (shop_id, kind, created_at);
ALTER TABLE customers ADD COLUMN inserted_at TEXT;
ALTER TABLE entries ADD COLUMN inserted_at TEXT;
ALTER TABLE shop_records ADD COLUMN inserted_at TEXT;
ALTER TABLE shops ADD COLUMN locale TEXT DEFAULT 'hinglish';
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'shop')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_shop_idx ON messages (shop_id, created_at);
CREATE TABLE IF NOT EXISTS memory_nodes (
  shop_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  last_amount INTEGER,
  last_note TEXT,
  last_intent TEXT,
  last_mentioned_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (shop_id, customer_id)
);
ALTER TABLE memory_nodes ADD COLUMN user_note TEXT;
CREATE TABLE IF NOT EXISTS rental_assets (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('property', 'equipment', 'other')),
  description TEXT,
  rate INTEGER NOT NULL,
  rate_period TEXT NOT NULL CHECK (rate_period IN ('per_day', 'per_week', 'per_month', 'one_time')),
  security_deposit INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'maintenance')) DEFAULT 'available',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rental_assets_shop_idx ON rental_assets (shop_id, status);
CREATE TABLE IF NOT EXISTS rental_agreements (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  actual_return_date TEXT,
  rate INTEGER NOT NULL,
  rate_period TEXT NOT NULL CHECK (rate_period IN ('per_day', 'per_week', 'per_month', 'one_time')),
  deposit_taken INTEGER NOT NULL DEFAULT 0,
  deposit_returned INTEGER NOT NULL DEFAULT 0,
  deposit_deductions INTEGER NOT NULL DEFAULT 0,
  deposit_deduction_reason TEXT,
  due_day INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rental_agreements_shop_idx ON rental_agreements (shop_id, status);
CREATE INDEX IF NOT EXISTS rental_agreements_asset_idx ON rental_agreements (asset_id);
CREATE INDEX IF NOT EXISTS rental_agreements_customer_idx ON rental_agreements (customer_id);
CREATE TABLE IF NOT EXISTS rental_payments (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  agreement_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('cash', 'UPI', 'other')),
  note TEXT,
  created_at TEXT NOT NULL,
  inserted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rental_payments_shop_idx ON rental_payments (shop_id, agreement_id);
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT,
  items_text TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  note TEXT,
  created_at TEXT NOT NULL,
  inserted_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS supplier_purchases_shop_idx ON supplier_purchases (shop_id, status);
ALTER TABLE entries ADD COLUMN due_date TEXT;
ALTER TABLE customers ADD COLUMN credit_limit INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN recurring_day INTEGER;
`;

export function schemaSql(): string {
  try {
    return readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  } catch {
    return EMBEDDED;
  }
}

export function schemaStatements(sql = schemaSql()): string[] {
  return sql
    .split(";")
    .map((part) => part.replace(/--[^\n]*/g, "").trim())
    .filter((part) => part.length > 0);
}
