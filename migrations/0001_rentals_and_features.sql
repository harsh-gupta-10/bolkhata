-- Additive migration for Rentals, Udhaar due dates, Credit limits, Recurring bills, and Supplier purchases

-- 1. Rental Assets (property, equipment, other rented OUT by shopkeeper)
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

-- 2. Rental Agreements (links asset to customer with terms, deposits, schedule)
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

-- 3. Rental Payments (rent received against agreement)
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

-- 4. Supplier purchases (lightweight stock/supplier ledger)
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

-- 5. Additive columns on existing tables
ALTER TABLE entries ADD COLUMN due_date TEXT;
ALTER TABLE customers ADD COLUMN credit_limit INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN is_recurring INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN recurring_day INTEGER;
