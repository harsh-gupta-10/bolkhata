-- BolKhata Migration 0002: Add is_sample tag to identify and manage sample/demo data

ALTER TABLE customers ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE entries ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE shop_records ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_assets ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_agreements ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE rental_payments ADD COLUMN is_sample INTEGER DEFAULT 0;
ALTER TABLE supplier_purchases ADD COLUMN is_sample INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS customers_sample_idx ON customers (shop_id, is_sample);
CREATE INDEX IF NOT EXISTS entries_sample_idx ON entries (shop_id, is_sample);
CREATE INDEX IF NOT EXISTS rental_assets_sample_idx ON rental_assets (shop_id, is_sample);
CREATE INDEX IF NOT EXISTS rental_agreements_sample_idx ON rental_agreements (shop_id, is_sample);
CREATE INDEX IF NOT EXISTS supplier_purchases_sample_idx ON supplier_purchases (shop_id, is_sample);
