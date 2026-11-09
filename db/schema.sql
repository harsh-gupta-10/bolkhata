-- BolKhata shop ledger. Apply to the D1 database bound as DB.
-- Every row that belongs to a shop carries shop_id. Sessions live here too (no KV).

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
  expires_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE INDEX IF NOT EXISTS sessions_shop_idx ON sessions (shop_id);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
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
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id),
  FOREIGN KEY (customer_id) REFERENCES customers (id)
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
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE INDEX IF NOT EXISTS shop_records_shop_idx ON shop_records (shop_id, kind, created_at);

-- Insert time, separate from the ledger date, so an 8-second undo still works if the line is backdated.
ALTER TABLE customers ADD COLUMN inserted_at TEXT;
ALTER TABLE entries ADD COLUMN inserted_at TEXT;
ALTER TABLE shop_records ADD COLUMN inserted_at TEXT;

-- Shop language. Default stays Hinglish.
ALTER TABLE shops ADD COLUMN locale TEXT DEFAULT 'hinglish';

-- One conversation board for the whole shop.
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'shop')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE INDEX IF NOT EXISTS messages_shop_idx ON messages (shop_id, created_at);

-- Compact memory of people the shop actually works with.
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

-- A shopkeeper's own note, separate from the last ledger line.
ALTER TABLE memory_nodes ADD COLUMN user_note TEXT;

-- Rental Assets (property, equipment, other rented OUT by shopkeeper)
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
  updated_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE INDEX IF NOT EXISTS rental_assets_shop_idx ON rental_assets (shop_id, status);

-- Rental Agreements (links asset to customer with terms, deposits, schedule)
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
  updated_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id),
  FOREIGN KEY (asset_id) REFERENCES rental_assets (id),
  FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX IF NOT EXISTS rental_agreements_shop_idx ON rental_agreements (shop_id, status);
CREATE INDEX IF NOT EXISTS rental_agreements_asset_idx ON rental_agreements (asset_id);
CREATE INDEX IF NOT EXISTS rental_agreements_customer_idx ON rental_agreements (customer_id);

-- Rental Payments (rent received against agreement)
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
  inserted_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id),
  FOREIGN KEY (agreement_id) REFERENCES rental_agreements (id),
  FOREIGN KEY (customer_id) REFERENCES customers (id),
  FOREIGN KEY (asset_id) REFERENCES rental_assets (id)
);

CREATE INDEX IF NOT EXISTS rental_payments_shop_idx ON rental_payments (shop_id, agreement_id);

-- Supplier purchases (lightweight stock/supplier ledger)
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
  inserted_at TEXT NOT NULL,
  FOREIGN KEY (shop_id) REFERENCES shops (id)
);

CREATE INDEX IF NOT EXISTS supplier_purchases_shop_idx ON supplier_purchases (shop_id, status);

-- Additive columns on existing tables
ALTER TABLE entries ADD COLUMN due_date TEXT;
ALTER TABLE customers ADD COLUMN credit_limit INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN recurring_day INTEGER;

-- Sample/Demo data tagging
ALTER TABLE customers ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE entries ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_assets ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_agreements ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_payments ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE supplier_purchases ADD COLUMN is_sample INTEGER DEFAULT 0;


