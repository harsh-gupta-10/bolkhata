import { getDb } from "@/lib/db";
import { settleBalances } from "@/lib/ledger-math";
import { presentPeople, type ShopPerson } from "@/lib/confirm";
import { normalizePhone } from "@/lib/session";
import type { Shop } from "@/lib/session";
import { calculateEquipmentRental, getIstTodayString } from "@/lib/rentals-math";

export interface CustomerRow {
  id: string;
  shop_id: string;
  name: string;
  phone: string | null;
  created_at: string;
  balance: number;
  credit_limit: number;
  is_sample?: number;
}

export interface EntryRow {
  id: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  type: "udhaar" | "payment";
  amount: number;
  note: string | null;
  running_balance: number;
  transcript: string | null;
  created_at: string;
  due_date: string | null;
  is_sample?: number;
}

export interface RecordRow {
  id: string;
  shop_id: string;
  kind: "rent" | "bill";
  status: "due" | "paid";
  amount: number;
  label: string;
  bill_kind: string | null;
  party: string | null;
  period: string | null;
  note: string | null;
  transcript: string | null;
  created_at: string;
  is_recurring: number;
  recurring_day: number | null;
  is_sample?: number;
}

export async function listCustomers(shopId: string): Promise<CustomerRow[]> {
  const db = await getDb();
  return db.all<CustomerRow>(
    `SELECT customers.id, customers.shop_id, customers.name, customers.phone, customers.created_at,
            COALESCE(customers.credit_limit, 0) AS credit_limit,
            COALESCE(customers.is_sample, 0) AS is_sample,
            COALESCE((
              SELECT running_balance FROM entries
              WHERE entries.customer_id = customers.id AND entries.shop_id = customers.shop_id
              ORDER BY created_at DESC, id DESC LIMIT 1
            ), 0) AS balance
     FROM customers
     WHERE customers.shop_id = ?
     ORDER BY customers.created_at DESC`,
    shopId,
  );
}

export async function listEntries(shopId: string, type?: "udhaar" | "payment"): Promise<EntryRow[]> {
  const db = await getDb();
  const typeSql = type ? "AND entries.type = ?" : "";
  const params = type ? [shopId, type] : [shopId];
  return db.all<EntryRow>(
    `SELECT entries.id, entries.shop_id, entries.customer_id, customers.name AS customer_name,
            customers.phone AS customer_phone, entries.type, entries.amount, entries.note,
            entries.running_balance, entries.transcript, entries.created_at, entries.due_date,
            COALESCE(entries.is_sample, 0) AS is_sample
     FROM entries JOIN customers ON customers.id = entries.customer_id AND customers.shop_id = entries.shop_id
     WHERE entries.shop_id = ? ${typeSql}
     ORDER BY entries.created_at DESC, entries.id DESC`,
    ...params,
  );
}

export async function listRecords(shopId: string, kind?: "rent" | "bill"): Promise<RecordRow[]> {
  const db = await getDb();
  const kindSql = kind ? "AND kind = ?" : "";
  const params = kind ? [shopId, kind] : [shopId];
  return db.all<RecordRow>(
    `SELECT id, shop_id, kind, status, amount, label, bill_kind, party, period, note, transcript, created_at,
            COALESCE(is_recurring, 0) AS is_recurring, recurring_day,
            COALESCE(is_sample, 0) AS is_sample
     FROM shop_records WHERE shop_id = ? ${kindSql}
     ORDER BY created_at DESC, id DESC`,
    ...params,
  );
}

export async function resolveName(shopId: string, query: string) {
  const customers = await listCustomers(shopId);
  const people: ShopPerson[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    balance: Number(customer.balance) || 0,
  }));
  return presentPeople(query, people);
}

export async function createCustomer(shopId: string, input: { name: string; phone?: string | null; creditLimit?: number | null; isSample?: number }): Promise<CustomerRow> {
  const db = await getDb();
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Phone zaroori hai.");
  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const creditLimit = input.creditLimit != null ? Math.max(0, Math.round(input.creditLimit)) : 0;
  const isSample = input.isSample ? 1 : 0;
  await db.run(
    `INSERT INTO customers (id, shop_id, name, phone, created_at, inserted_at, credit_limit, is_sample) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.name.trim(),
    phone,
    created,
    created,
    creditLimit,
    isSample,
  );
  await rememberNode(shopId, { customerId: id, name: input.name.trim(), phone, balance: 0, intent: "add_customer" });
  return { id, shop_id: shopId, name: input.name.trim(), phone, created_at: created, balance: 0, credit_limit: creditLimit, is_sample: isSample };
}

export async function stampPhone(shopId: string, customerId: string, phone: string): Promise<void> {
  const db = await getDb();
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error("Phone zaroori hai.");
  const row = await db.get<{ phone: string | null }>(`SELECT phone FROM customers WHERE id = ? AND shop_id = ?`, customerId, shopId);
  if (!row) throw new Error("Grahak nahi mila.");
  if (!row.phone) {
    await db.run(`UPDATE customers SET phone = ? WHERE id = ? AND shop_id = ?`, normalized, customerId, shopId);
  }
}

export async function updateCustomer(shopId: string, id: string, input: { name: string; phone?: string | null; creditLimit?: number | null }): Promise<void> {
  const db = await getDb();
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Phone zaroori hai.");
  const creditLimit = input.creditLimit != null ? Math.max(0, Math.round(input.creditLimit)) : null;
  await db.run(
    `UPDATE customers SET name = ?, phone = ?, credit_limit = COALESCE(?, credit_limit) WHERE id = ? AND shop_id = ?`,
    input.name.trim(),
    phone,
    creditLimit,
    id,
    shopId,
  );
}

export async function addEntry(
  shopId: string,
  input: { customerId: string; type: "udhaar" | "payment"; amount: number; note?: string | null; transcript?: string | null; createdAt?: string; dueDate?: string | null; isSample?: number },
): Promise<{ id: string; balance: number }> {
  const db = await getDb();
  const owned = await db.get<{ id: string; phone: string | null; is_sample?: number }>(
    `SELECT id, phone, is_sample FROM customers WHERE id = ? AND shop_id = ?`,
    input.customerId,
    shopId,
  );
  if (!owned) throw new Error("Grahak is dukaan ka nahi hai.");
  if (!owned.phone) throw new Error("Phone zaroori hai.");
  const named = await db.get<{ name: string }>(`SELECT name FROM customers WHERE id = ? AND shop_id = ?`, input.customerId, shopId);
  const id = crypto.randomUUID();
  const inserted = new Date().toISOString();
  const isSample = input.isSample != null ? (input.isSample ? 1 : 0) : (owned.is_sample ? 1 : 0);
  await db.run(
    `INSERT INTO entries (id, shop_id, customer_id, type, amount, note, running_balance, transcript, created_at, inserted_at, due_date, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.customerId,
    input.type,
    input.amount,
    input.note ?? null,
    input.transcript ?? null,
    input.createdAt ?? inserted,
    inserted,
    input.dueDate ?? null,
    isSample,
  );
  const balance = await recompute(db, shopId, input.customerId);
  if (named) await syncDerivedMemory(shopId, input.customerId, named.name, owned.phone);
  return { id, balance };
}

export async function updateEntry(
  shopId: string,
  id: string,
  input: { customerId: string; amount: number; note?: string | null; createdAt: string; dueDate?: string | null },
): Promise<void> {
  const db = await getDb();
  const existing = await db.get<{ customer_id: string; type: string }>(
    `SELECT customer_id, type FROM entries WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!existing) throw new Error("Entry nahi mili.");
  const owned = await db.get(`SELECT id FROM customers WHERE id = ? AND shop_id = ?`, input.customerId, shopId);
  if (!owned) throw new Error("Grahak is dukaan ka nahi hai.");
  await db.run(
    `UPDATE entries SET customer_id = ?, amount = ?, note = ?, created_at = ?, due_date = ? WHERE id = ? AND shop_id = ?`,
    input.customerId,
    input.amount,
    input.note ?? null,
    input.createdAt,
    input.dueDate ?? null,
    id,
    shopId,
  );
  await recompute(db, shopId, existing.customer_id);
  await syncDerivedMemory(shopId, existing.customer_id);
  if (existing.customer_id !== input.customerId) {
    await recompute(db, shopId, input.customerId);
    await syncDerivedMemory(shopId, input.customerId);
  }
}

export async function addRecord(
  shopId: string,
  input: {
    kind: "rent" | "bill";
    status: "due" | "paid";
    amount: number;
    label: string;
    billKind?: string | null;
    party?: string | null;
    period?: string | null;
    note?: string | null;
    transcript?: string | null;
    createdAt?: string;
    isRecurring?: number | null;
    recurringDay?: number | null;
    isSample?: number;
  },
): Promise<{ id: string }> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const inserted = new Date().toISOString();
  await db.run(
    `INSERT INTO shop_records (id, shop_id, kind, status, amount, label, bill_kind, party, period, note, transcript, created_at, inserted_at, is_recurring, recurring_day, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.kind,
    input.status,
    input.amount,
    input.label,
    input.billKind ?? null,
    input.party ?? null,
    input.period ?? null,
    input.note ?? null,
    input.transcript ?? null,
    input.createdAt ?? inserted,
    inserted,
    input.isRecurring ? 1 : 0,
    input.recurringDay ?? null,
    input.isSample ? 1 : 0,
  );
  return { id };
}

const UNDO_MS = 12_000;

export async function undoEntry(shopId: string, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ customer_id: string; inserted_at: string | null; created_at: string }>(
    `SELECT customer_id, inserted_at, created_at FROM entries WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!row) throw new Error("Entry nahi mili.");
  if (Date.now() - new Date(row.inserted_at || row.created_at).getTime() > UNDO_MS) throw new Error("Undo ka time nikal gaya.");
  await db.run(`DELETE FROM entries WHERE id = ? AND shop_id = ?`, id, shopId);
  await recompute(db, shopId, row.customer_id);
  await syncDerivedMemory(shopId, row.customer_id);
}

export async function undoRecord(shopId: string, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ inserted_at: string | null; created_at: string }>(
    `SELECT inserted_at, created_at FROM shop_records WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!row) throw new Error("Record nahi mili.");
  if (Date.now() - new Date(row.inserted_at || row.created_at).getTime() > UNDO_MS) throw new Error("Undo ka time nikal gaya.");
  await db.run(`DELETE FROM shop_records WHERE id = ? AND shop_id = ?`, id, shopId);
}

export async function undoCustomer(shopId: string, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ inserted_at: string | null; created_at: string }>(
    `SELECT inserted_at, created_at FROM customers WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!row) return;
  const left = await db.get<{ n: number }>(`SELECT COUNT(*) AS n FROM entries WHERE customer_id = ? AND shop_id = ?`, id, shopId);
  if (Number(left?.n ?? 0) > 0) return;
  if (Date.now() - new Date(row.inserted_at || row.created_at).getTime() > UNDO_MS) return;
  await db.run(`DELETE FROM customers WHERE id = ? AND shop_id = ?`, id, shopId);
}

export async function updateShop(shopId: string, input: { name: string; ownerName: string; phone: string | null; locale?: string | null }): Promise<void> {
  const db = await getDb();
  const locale = input.locale === "en" || input.locale === "hinglish" ? input.locale : null;
  if (locale) {
    await db.run(
      `UPDATE shops SET name = ?, owner_name = ?, phone = ?, locale = ? WHERE id = ?`,
      input.name.trim(),
      input.ownerName.trim(),
      normalizePhone(input.phone),
      locale,
      shopId,
    );
    return;
  }
  await db.run(
    `UPDATE shops SET name = ?, owner_name = ?, phone = ? WHERE id = ?`,
    input.name.trim(),
    input.ownerName.trim(),
    normalizePhone(input.phone),
    shopId,
  );
}

export async function setShopLocale(shopId: string, locale: string): Promise<void> {
  const db = await getDb();
  await db.run(`UPDATE shops SET locale = ? WHERE id = ?`, locale === "en" ? "en" : "hinglish", shopId);
}

export interface ChatMessageRow {
  id: string;
  role: "user" | "shop";
  text: string;
  created_at: string;
}

export async function listMessages(shopId: string): Promise<ChatMessageRow[]> {
  const db = await getDb();
  const rows = await db.all<ChatMessageRow>(
    `SELECT id, role, text, created_at FROM messages WHERE shop_id = ? ORDER BY created_at DESC LIMIT 200`,
    shopId,
  );
  return rows.reverse();
}

export async function addMessage(shopId: string, role: "user" | "shop", text: string): Promise<ChatMessageRow> {
  const db = await getDb();
  const row: ChatMessageRow = { id: crypto.randomUUID(), role, text: text.slice(0, 2000), created_at: new Date().toISOString() };
  await db.run(`INSERT INTO messages (id, shop_id, role, text, created_at) VALUES (?, ?, ?, ?, ?)`, row.id, shopId, row.role, row.text, row.created_at);
  return row;
}

export interface MemoryRow {
  customer_id: string;
  name: string;
  phone: string | null;
  balance: number;
  last_amount: number | null;
  last_note: string | null;
  last_intent: string | null;
  updated_at: string;
  user_note: string | null;
}

export async function listMemory(shopId: string, limit = 80): Promise<MemoryRow[]> {
  const db = await getDb();
  return db.all<MemoryRow>(
    `SELECT customer_id, name, phone, balance, last_amount, last_note, last_intent, updated_at, user_note
     FROM memory_nodes WHERE shop_id = ? AND customer_id NOT LIKE 'record:%' ORDER BY updated_at DESC LIMIT ?`,
    shopId,
    limit,
  );
}

export async function saveUserNote(shopId: string, input: { customerId: string; name: string; phone?: string | null; note: string }): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const existing = await db.get(`SELECT customer_id FROM memory_nodes WHERE shop_id = ? AND customer_id = ?`, shopId, input.customerId);
  if (existing) {
    await db.run(
      `UPDATE memory_nodes SET name = ?, phone = COALESCE(?, phone), user_note = ?, updated_at = ? WHERE shop_id = ? AND customer_id = ?`,
      input.name,
      input.phone ?? null,
      input.note,
      now,
      shopId,
      input.customerId,
    );
    return;
  }
  await db.run(
    `INSERT INTO memory_nodes (shop_id, customer_id, name, phone, balance, last_amount, last_note, last_intent, last_mentioned_at, updated_at, user_note)
     VALUES (?, ?, ?, ?, 0, NULL, NULL, NULL, ?, ?, ?)`,
    shopId,
    input.customerId,
    input.name,
    input.phone ?? null,
    now,
    now,
    input.note,
  );
}

export async function deleteMemory(shopId: string, customerId: string): Promise<void> {
  const db = await getDb();
  await db.run(`DELETE FROM memory_nodes WHERE shop_id = ? AND customer_id = ?`, shopId, customerId);
}

export async function rememberNode(shopId: string, input: { customerId: string; name: string; phone?: string | null; balance: number; amount?: number | null; note?: string | null; intent: string }): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO memory_nodes (shop_id, customer_id, name, phone, balance, last_amount, last_note, last_intent, last_mentioned_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (shop_id, customer_id) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       balance = excluded.balance,
       last_amount = excluded.last_amount,
       last_note = excluded.last_note,
       last_intent = excluded.last_intent,
       last_mentioned_at = excluded.last_mentioned_at,
       updated_at = excluded.updated_at`,
    shopId,
    input.customerId,
    input.name,
    input.phone ?? null,
    input.balance,
    input.amount ?? null,
    input.note ?? null,
    input.intent,
    now,
    now,
  );
}

export async function pruneUnusedCustomers(shopId: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  const cutoff = new Date(now - 10 * 60 * 1000).toISOString();
  await db.run(
    `DELETE FROM customers
     WHERE shop_id = ?
     AND NOT EXISTS (SELECT 1 FROM entries e WHERE e.shop_id = customers.shop_id AND e.customer_id = customers.id)
     AND NOT EXISTS (
       SELECT 1 FROM shop_records r
       WHERE r.shop_id = customers.shop_id AND r.party IS NOT NULL AND lower(r.party) = lower(customers.name)
     )
     AND (inserted_at IS NULL OR inserted_at < ?)`,
    shopId,
    cutoff,
  );
  await db.run(
    `DELETE FROM memory_nodes
     WHERE shop_id = ?
     AND customer_id NOT LIKE 'record:%'
     AND customer_id NOT IN (SELECT id FROM customers WHERE shop_id = ?)`,
    shopId,
    shopId,
  );
}

export async function updateRecord(
  shopId: string,
  id: string,
  input: {
    status: "due" | "paid";
    amount: number;
    label: string;
    billKind?: string | null;
    party?: string | null;
    period?: string | null;
    note?: string | null;
    createdAt: string;
    isRecurring?: number | null;
    recurringDay?: number | null;
  },
): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE shop_records SET status = ?, amount = ?, label = ?, bill_kind = ?, party = ?, period = ?, note = ?, created_at = ?,
            is_recurring = COALESCE(?, is_recurring), recurring_day = COALESCE(?, recurring_day)
     WHERE id = ? AND shop_id = ?`,
    input.status,
    input.amount,
    input.label,
    input.billKind ?? null,
    input.party ?? null,
    input.period ?? null,
    input.note ?? null,
    input.createdAt,
    input.isRecurring != null ? (input.isRecurring ? 1 : 0) : null,
    input.recurringDay ?? null,
    id,
    shopId,
  );
}

async function recompute(db: Awaited<ReturnType<typeof getDb>>, shopId: string, customerId: string): Promise<number> {
  const rows = await db.all<{ id: string; type: "udhaar" | "payment"; amount: number; created_at: string; inserted_at: string | null }>(
    `SELECT id, type, amount, created_at, inserted_at FROM entries WHERE shop_id = ? AND customer_id = ?`,
    shopId,
    customerId,
  );
  const settled = settleBalances(
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      createdAt: row.created_at,
      insertedAt: row.inserted_at || row.created_at,
    })),
  );
  for (const row of settled) {
    await db.run(`UPDATE entries SET running_balance = ? WHERE id = ? AND shop_id = ?`, row.balance, row.id, shopId);
  }
  return settled.length === 0 ? 0 : settled[settled.length - 1].balance;
}

/** Ledger-derived facts. A shopkeeper's own note in user_note is left alone. */
export async function syncDerivedMemory(shopId: string, customerId: string, name?: string, phone?: string | null): Promise<void> {
  const db = await getDb();
  const latest = await db.get<{ type: string; amount: number; note: string | null; running_balance: number }>(
    `SELECT type, amount, note, running_balance FROM entries
     WHERE shop_id = ? AND customer_id = ?
     ORDER BY created_at DESC, COALESCE(inserted_at, created_at) DESC, id DESC LIMIT 1`,
    shopId,
    customerId,
  );
  const existing = await db.get<{ user_note: string | null; name: string; phone: string | null }>(
    `SELECT user_note, name, phone FROM memory_nodes WHERE shop_id = ? AND customer_id = ?`,
    shopId,
    customerId,
  );
  if (!latest && !existing?.user_note) {
    await db.run(`DELETE FROM memory_nodes WHERE shop_id = ? AND customer_id = ?`, shopId, customerId);
    return;
  }
  const now = new Date().toISOString();
  const personName = name || existing?.name || "";
  if (!personName) return;
  await db.run(
    `INSERT INTO memory_nodes (shop_id, customer_id, name, phone, balance, last_amount, last_note, last_intent, last_mentioned_at, updated_at, user_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (shop_id, customer_id) DO UPDATE SET
       name = excluded.name,
       phone = COALESCE(excluded.phone, memory_nodes.phone),
       balance = excluded.balance,
       last_amount = excluded.last_amount,
       last_note = excluded.last_note,
       last_intent = excluded.last_intent,
       last_mentioned_at = excluded.last_mentioned_at,
       updated_at = excluded.updated_at`,
    shopId,
    customerId,
    personName,
    phone ?? existing?.phone ?? null,
    latest ? Number(latest.running_balance) : 0,
    latest ? Number(latest.amount) : null,
    latest?.note ?? null,
    latest?.type ?? null,
    now,
    now,
    existing?.user_note ?? null,
  );
}

export async function findShopsByEmail(email: string): Promise<Shop[]> {
  const db = await getDb();
  return db.all<Shop>(
    `SELECT id, name, owner_name, email, phone, created_at, locale FROM shops WHERE email = ? ORDER BY created_at ASC`,
    email,
  );
}

export async function insertShop(input: { name: string; ownerName: string; email: string; phone: string | null }): Promise<Shop> {
  const db = await getDb();
  const shop: Shop = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    owner_name: input.ownerName.trim(),
    email: input.email,
    phone: input.phone,
    created_at: new Date().toISOString(),
    locale: "hinglish",
  };
  await db.run(
    `INSERT INTO shops (id, name, owner_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    shop.id,
    shop.name,
    shop.owner_name,
    shop.email,
    shop.phone,
    shop.created_at,
  );
  return shop;
}

export interface RentalAssetRow {
  id: string;
  shop_id: string;
  name: string;
  type: "property" | "equipment" | "other";
  description: string | null;
  rate: number;
  rate_period: "per_day" | "per_week" | "per_month" | "one_time";
  security_deposit: number;
  status: "available" | "rented" | "maintenance";
  notes: string | null;
  created_at: string;
  updated_at: string;
  rate_amount: number;
  security_deposit_amount: number;
  is_sample?: number;
}

export async function listRentalAssets(shopId: string, status?: string): Promise<RentalAssetRow[]> {
  const db = await getDb();
  const statusSql = status ? "AND status = ?" : "";
  const params = status ? [shopId, status] : [shopId];
  return db.all<RentalAssetRow>(
    `SELECT id, shop_id, name, type, description, rate, rate_period, security_deposit, status, notes, created_at, updated_at,
            rate AS rate_amount, security_deposit AS security_deposit_amount,
            COALESCE(is_sample, 0) AS is_sample
     FROM rental_assets WHERE shop_id = ? ${statusSql}
     ORDER BY created_at DESC`,
    ...params,
  );
}

export async function getRentalAsset(shopId: string, id: string): Promise<RentalAssetRow | null> {
  const db = await getDb();
  return db.get<RentalAssetRow>(
    `SELECT *, rate AS rate_amount, security_deposit AS security_deposit_amount, COALESCE(is_sample, 0) AS is_sample FROM rental_assets WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
}

export async function createRentalAsset(
  shopId: string,
  input: {
    name: string;
    type: "property" | "equipment" | "other";
    description?: string | null;
    rate: number;
    ratePeriod: "per_day" | "per_week" | "per_month" | "one_time";
    securityDeposit?: number;
    notes?: string | null;
    isSample?: number;
  },
): Promise<RentalAssetRow> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const deposit = Math.max(0, Math.round(Number(input.securityDeposit) || 0));
  const isSample = input.isSample ? 1 : 0;
  await db.run(
    `INSERT INTO rental_assets (id, shop_id, name, type, description, rate, rate_period, security_deposit, status, notes, created_at, updated_at, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?)`,
    id,
    shopId,
    input.name.trim(),
    input.type,
    input.description?.trim() || null,
    Math.round(input.rate),
    input.ratePeriod,
    deposit,
    input.notes?.trim() || null,
    now,
    now,
    isSample,
  );
  return {
    id,
    shop_id: shopId,
    name: input.name.trim(),
    type: input.type,
    description: input.description?.trim() || null,
    rate: Math.round(input.rate),
    rate_period: input.ratePeriod,
    security_deposit: deposit,
    status: "available",
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
    rate_amount: Math.round(input.rate),
    security_deposit_amount: deposit,
    is_sample: isSample,
  };
}

export async function updateRentalAsset(
  shopId: string,
  id: string,
  input: {
    name?: string;
    type?: "property" | "equipment" | "other";
    description?: string | null;
    rate?: number;
    ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
    securityDeposit?: number;
    status?: "available" | "rented" | "maintenance";
    notes?: string | null;
  },
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.run(
    `UPDATE rental_assets SET
       name = COALESCE(?, name),
       type = COALESCE(?, type),
       description = COALESCE(?, description),
       rate = COALESCE(?, rate),
       rate_period = COALESCE(?, rate_period),
       security_deposit = COALESCE(?, security_deposit),
       status = COALESCE(?, status),
       notes = COALESCE(?, notes),
       updated_at = ?
     WHERE id = ? AND shop_id = ?`,
    input.name?.trim() ?? null,
    input.type ?? null,
    input.description?.trim() ?? null,
    input.rate != null ? Math.round(input.rate) : null,
    input.ratePeriod ?? null,
    input.securityDeposit != null ? Math.round(input.securityDeposit) : null,
    input.status ?? null,
    input.notes?.trim() ?? null,
    now,
    id,
    shopId,
  );
}

export interface RentalAgreementRow {
  id: string;
  shop_id: string;
  asset_id: string;
  asset_name: string;
  asset_type: "property" | "equipment" | "other";
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  start_date: string;
  end_date: string | null;
  expected_end_date?: string | null;
  actual_return_date: string | null;
  rate: number;
  rate_amount: number;
  rate_period: "per_day" | "per_week" | "per_month" | "one_time";
  deposit_taken: number;
  deposit_amount: number;
  deposit_returned: number;
  deposit_deductions: number;
  deposit_deduction_reason: string | null;
  due_day: number | null;
  status: "active" | "ended";
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_sample?: number;
}

export async function listRentalAgreements(shopId: string, status?: "active" | "ended"): Promise<RentalAgreementRow[]> {
  const db = await getDb();
  const statusSql = status ? "AND ra.status = ?" : "";
  const params = status ? [shopId, status] : [shopId];
  return db.all<RentalAgreementRow>(
    `SELECT ra.id, ra.shop_id, ra.asset_id, asset.name AS asset_name, asset.type AS asset_type,
            ra.customer_id, cust.name AS customer_name, cust.phone AS customer_phone,
            ra.start_date, ra.end_date, ra.end_date AS expected_end_date, ra.actual_return_date,
            ra.rate, ra.rate AS rate_amount, ra.rate_period,
            ra.deposit_taken, ra.deposit_taken AS deposit_amount, ra.deposit_returned, ra.deposit_deductions, ra.deposit_deduction_reason,
            ra.due_day, ra.status, ra.notes, ra.created_at, ra.updated_at,
            COALESCE(ra.is_sample, 0) AS is_sample
     FROM rental_agreements ra
     JOIN rental_assets asset ON asset.id = ra.asset_id AND asset.shop_id = ra.shop_id
     JOIN customers cust ON cust.id = ra.customer_id AND cust.shop_id = ra.shop_id
     WHERE ra.shop_id = ? ${statusSql}
     ORDER BY ra.created_at DESC`,
    ...params,
  );
}

export async function getRentalAgreement(shopId: string, id: string): Promise<RentalAgreementRow | null> {
  const db = await getDb();
  return db.get<RentalAgreementRow>(
    `SELECT ra.id, ra.shop_id, ra.asset_id, asset.name AS asset_name, asset.type AS asset_type,
            ra.customer_id, cust.name AS customer_name, cust.phone AS customer_phone,
            ra.start_date, ra.end_date, ra.actual_return_date, ra.rate, ra.rate_period,
            ra.deposit_taken, ra.deposit_returned, ra.deposit_deductions, ra.deposit_deduction_reason,
            ra.due_day, ra.status, ra.notes, ra.created_at, ra.updated_at,
            COALESCE(ra.is_sample, 0) AS is_sample
     FROM rental_agreements ra
     JOIN rental_assets asset ON asset.id = ra.asset_id AND asset.shop_id = ra.shop_id
     JOIN customers cust ON cust.id = ra.customer_id AND cust.shop_id = ra.shop_id
     WHERE ra.id = ? AND ra.shop_id = ?`,
    id,
    shopId,
  );
}

export async function createRentalAgreement(
  shopId: string,
  input: {
    assetId: string;
    customerId: string;
    startDate: string;
    endDate?: string | null;
    rate?: number;
    ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
    depositTaken?: number;
    dueDay?: number | null;
    notes?: string | null;
    isSample?: number;
  },
): Promise<RentalAgreementRow> {
  const db = await getDb();
  const asset = await db.get<RentalAssetRow>(`SELECT * FROM rental_assets WHERE id = ? AND shop_id = ?`, input.assetId, shopId);
  if (!asset) throw new Error("Asset nahi mila.");
  const customer = await db.get<{ name: string; phone: string | null }>(`SELECT name, phone FROM customers WHERE id = ? AND shop_id = ?`, input.customerId, shopId);
  if (!customer) throw new Error("Grahak nahi mila.");
  if (!customer.phone) throw new Error("Phone zaroori hai. 10 digit phone confirm karo.");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const rate = input.rate != null ? Math.round(input.rate) : asset.rate;
  const ratePeriod = input.ratePeriod || asset.rate_period;
  const deposit = input.depositTaken != null ? Math.round(input.depositTaken) : asset.security_deposit;
  const isSample = input.isSample ? 1 : 0;

  await db.run(
    `INSERT INTO rental_agreements (id, shop_id, asset_id, customer_id, start_date, end_date, actual_return_date, rate, rate_period, deposit_taken, deposit_returned, deposit_deductions, deposit_deduction_reason, due_day, status, notes, created_at, updated_at, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 0, 0, NULL, ?, 'active', ?, ?, ?, ?)`,
    id,
    shopId,
    input.assetId,
    input.customerId,
    input.startDate.slice(0, 10),
    input.endDate ? input.endDate.slice(0, 10) : null,
    rate,
    ratePeriod,
    deposit,
    input.dueDay != null ? Math.round(input.dueDay) : null,
    input.notes?.trim() || null,
    now,
    now,
    isSample,
  );

  await db.run(`UPDATE rental_assets SET status = 'rented', updated_at = ? WHERE id = ? AND shop_id = ?`, now, input.assetId, shopId);

  const memoryDesc = `${customer.name} — ${asset.name} tenant, rent ₹${rate} ${ratePeriod === "per_month" && input.dueDay ? `due on ${input.dueDay}th` : ratePeriod}`;
  await saveUserNote(shopId, { customerId: input.customerId, name: customer.name, phone: customer.phone, note: memoryDesc });

  return {
    id,
    shop_id: shopId,
    asset_id: input.assetId,
    asset_name: asset.name,
    asset_type: asset.type,
    customer_id: input.customerId,
    customer_name: customer.name,
    customer_phone: customer.phone,
    start_date: input.startDate.slice(0, 10),
    end_date: input.endDate ? input.endDate.slice(0, 10) : null,
    actual_return_date: null,
    rate,
    rate_amount: rate,
    rate_period: ratePeriod,
    deposit_taken: deposit,
    deposit_amount: deposit,
    deposit_returned: 0,
    deposit_deductions: 0,
    deposit_deduction_reason: null,
    due_day: input.dueDay != null ? Math.round(input.dueDay) : null,
    status: "active",
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
    is_sample: isSample,
  };
}

export async function returnRentalEquipment(
  shopId: string,
  agreementId: string,
  actualReturnDate?: string,
): Promise<{ totalAmount: number; totalDays: number; lateDays: number }> {
  const db = await getDb();
  const agreement = await db.get<RentalAgreementRow>(
    `SELECT ra.*, asset.name AS asset_name, asset.type AS asset_type, cust.name AS customer_name, cust.phone AS customer_phone
     FROM rental_agreements ra
     JOIN rental_assets asset ON asset.id = ra.asset_id
     JOIN customers cust ON cust.id = ra.customer_id
     WHERE ra.id = ? AND ra.shop_id = ?`,
    agreementId,
    shopId,
  );
  if (!agreement) throw new Error("Agreement nahi mila.");
  const returnDate = actualReturnDate ? actualReturnDate.slice(0, 10) : getIstTodayString();
  const now = new Date().toISOString();

  const calc = calculateEquipmentRental({
    startDate: agreement.start_date,
    expectedEndDate: agreement.end_date,
    actualReturnDate: returnDate,
    dailyRate: agreement.rate,
  });

  await db.run(
    `UPDATE rental_agreements SET actual_return_date = ?, status = 'ended', updated_at = ? WHERE id = ? AND shop_id = ?`,
    returnDate,
    now,
    agreementId,
    shopId,
  );

  await db.run(`UPDATE rental_assets SET status = 'available', updated_at = ? WHERE id = ? AND shop_id = ?`, now, agreement.asset_id, shopId);

  return { totalAmount: calc.totalAmount, totalDays: calc.totalDays, lateDays: calc.lateDays };
}

export async function endRentalAgreement(
  shopId: string,
  agreementId: string,
  input: {
    depositReturned?: number;
    depositDeductions?: number;
    depositDeductionReason?: string | null;
  },
): Promise<void> {
  const db = await getDb();
  const agreement = await db.get<{ asset_id: string }>(`SELECT asset_id FROM rental_agreements WHERE id = ? AND shop_id = ?`, agreementId, shopId);
  if (!agreement) throw new Error("Agreement nahi mila.");
  const now = new Date().toISOString();

  await db.run(
    `UPDATE rental_agreements SET
       status = 'ended',
       deposit_returned = COALESCE(?, deposit_returned),
       deposit_deductions = COALESCE(?, deposit_deductions),
       deposit_deduction_reason = COALESCE(?, deposit_deduction_reason),
       updated_at = ?
     WHERE id = ? AND shop_id = ?`,
    input.depositReturned != null ? Math.round(input.depositReturned) : null,
    input.depositDeductions != null ? Math.round(input.depositDeductions) : null,
    input.depositDeductionReason?.trim() || null,
    now,
    agreementId,
    shopId,
  );

  await db.run(`UPDATE rental_assets SET status = 'available', updated_at = ? WHERE id = ? AND shop_id = ?`, now, agreement.asset_id, shopId);
}

export interface RentalPaymentRow {
  id: string;
  shop_id: string;
  agreement_id: string;
  customer_id: string;
  customer_name: string;
  asset_id: string;
  asset_name: string;
  amount: number;
  payment_date: string;
  mode: "cash" | "UPI" | "other";
  note: string | null;
  created_at: string;
  inserted_at: string;
  is_sample?: number;
}

export async function listRentalPayments(shopId: string, agreementId?: string): Promise<RentalPaymentRow[]> {
  const db = await getDb();
  const sqlFilter = agreementId ? "AND rp.agreement_id = ?" : "";
  const params = agreementId ? [shopId, agreementId] : [shopId];
  return db.all<RentalPaymentRow>(
    `SELECT rp.id, rp.shop_id, rp.agreement_id, rp.customer_id, cust.name AS customer_name,
            rp.asset_id, asset.name AS asset_name, rp.amount, rp.payment_date, rp.mode, rp.note,
            rp.created_at, rp.inserted_at,
            COALESCE(rp.is_sample, 0) AS is_sample
     FROM rental_payments rp
     JOIN customers cust ON cust.id = rp.customer_id AND cust.shop_id = rp.shop_id
     JOIN rental_assets asset ON asset.id = rp.asset_id AND asset.shop_id = rp.shop_id
     WHERE rp.shop_id = ? ${sqlFilter}
     ORDER BY rp.payment_date DESC, rp.id DESC`,
    ...params,
  );
}

export async function addRentalPayment(
  shopId: string,
  input: {
    agreementId: string;
    amount: number;
    paymentDate?: string;
    mode?: "cash" | "UPI" | "other";
    note?: string | null;
    isSample?: number;
  },
): Promise<{ id: string; agreementId: string; amount: number }> {
  const db = await getDb();
  const agreement = await db.get<{ asset_id: string; customer_id: string; is_sample?: number }>(
    `SELECT asset_id, customer_id, is_sample FROM rental_agreements WHERE id = ? AND shop_id = ?`,
    input.agreementId,
    shopId,
  );
  if (!agreement) throw new Error("Rental agreement nahi mila.");

  const id = crypto.randomUUID();
  const inserted = new Date().toISOString();
  const paymentDate = input.paymentDate ? input.paymentDate.slice(0, 10) : getIstTodayString();
  const amount = Math.round(input.amount);
  const mode = input.mode === "UPI" || input.mode === "other" ? input.mode : "cash";
  const isSample = input.isSample != null ? (input.isSample ? 1 : 0) : (agreement.is_sample ? 1 : 0);

  await db.run(
    `INSERT INTO rental_payments (id, shop_id, agreement_id, customer_id, asset_id, amount, payment_date, mode, note, created_at, inserted_at, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.agreementId,
    agreement.customer_id,
    agreement.asset_id,
    amount,
    paymentDate,
    mode,
    input.note?.trim() || null,
    inserted,
    inserted,
    isSample,
  );

  return { id, agreementId: input.agreementId, amount };
}

export async function undoRentalPayment(shopId: string, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ inserted_at: string | null; created_at: string }>(
    `SELECT inserted_at, created_at FROM rental_payments WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!row) throw new Error("Payment record nahi mila.");
  if (Date.now() - new Date(row.inserted_at || row.created_at).getTime() > UNDO_MS) throw new Error("Undo ka time nikal gaya.");
  await db.run(`DELETE FROM rental_payments WHERE id = ? AND shop_id = ?`, id, shopId);
}

export async function convertRentToUdhaar(
  shopId: string,
  input: {
    agreementId: string;
    amount: number;
    note?: string | null;
  },
): Promise<{ entryId: string; paymentId: string; balance: number }> {
  const db = await getDb();
  const agreement = await db.get<{ asset_id: string; customer_id: string }>(
    `SELECT asset_id, customer_id FROM rental_agreements WHERE id = ? AND shop_id = ?`,
    input.agreementId,
    shopId,
  );
  if (!agreement) throw new Error("Rental agreement nahi mila.");

  const asset = await db.get<{ name: string }>(`SELECT name FROM rental_assets WHERE id = ? AND shop_id = ?`, agreement.asset_id, shopId);
  const assetName = asset?.name || "Kiraya";
  const note = input.note || `Kiraya baaki: ${assetName}`;

  const entry = await addEntry(shopId, {
    customerId: agreement.customer_id,
    type: "udhaar",
    amount: input.amount,
    note,
  });

  const payment = await addRentalPayment(shopId, {
    agreementId: input.agreementId,
    amount: input.amount,
    mode: "other",
    note: `Udhaar me transfer kiya (${entry.id.slice(0, 8)})`,
  });

  return { entryId: entry.id, paymentId: payment.id, balance: entry.balance };
}

export interface SupplierPurchaseRow {
  id: string;
  shop_id: string;
  supplier_name: string;
  supplier_phone: string | null;
  items_text: string;
  amount: number;
  status: "paid" | "pending";
  note: string | null;
  created_at: string;
  inserted_at: string;
  is_sample?: number;
}

export async function listSupplierPurchases(shopId: string, status?: "paid" | "pending"): Promise<SupplierPurchaseRow[]> {
  const db = await getDb();
  const statusSql = status ? "AND status = ?" : "";
  const params = status ? [shopId, status] : [shopId];
  return db.all<SupplierPurchaseRow>(
    `SELECT id, shop_id, supplier_name, supplier_phone, items_text, amount, status, note, created_at, inserted_at,
            COALESCE(is_sample, 0) AS is_sample
     FROM supplier_purchases WHERE shop_id = ? ${statusSql}
     ORDER BY created_at DESC, id DESC`,
    ...params,
  );
}

export async function createSupplierPurchase(
  shopId: string,
  input: {
    supplierName: string;
    supplierPhone?: string | null;
    itemsText: string;
    amount: number;
    status: "paid" | "pending";
    note?: string | null;
    createdAt?: string;
    isSample?: number;
  },
): Promise<{ id: string }> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const inserted = new Date().toISOString();
  const isSample = input.isSample ? 1 : 0;
  await db.run(
    `INSERT INTO supplier_purchases (id, shop_id, supplier_name, supplier_phone, items_text, amount, status, note, created_at, inserted_at, is_sample)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    shopId,
    input.supplierName.trim(),
    input.supplierPhone ? normalizePhone(input.supplierPhone) : null,
    input.itemsText.trim(),
    Math.round(input.amount),
    input.status,
    input.note?.trim() || null,
    input.createdAt || inserted,
    inserted,
    isSample,
  );
  return { id };
}

export async function updateSupplierPurchase(
  shopId: string,
  id: string,
  input: {
    status?: "paid" | "pending";
    amount?: number;
    itemsText?: string;
    supplierName?: string;
    note?: string | null;
  },
): Promise<void> {
  const db = await getDb();
  await db.run(
    `UPDATE supplier_purchases SET
       status = COALESCE(?, status),
       amount = COALESCE(?, amount),
       items_text = COALESCE(?, items_text),
       supplier_name = COALESCE(?, supplier_name),
       note = COALESCE(?, note)
     WHERE id = ? AND shop_id = ?`,
    input.status ?? null,
    input.amount != null ? Math.round(input.amount) : null,
    input.itemsText?.trim() ?? null,
    input.supplierName?.trim() ?? null,
    input.note?.trim() ?? null,
    id,
    shopId,
  );
}

export async function undoSupplierPurchase(shopId: string, id: string): Promise<void> {
  const db = await getDb();
  const row = await db.get<{ inserted_at: string | null; created_at: string }>(
    `SELECT inserted_at, created_at FROM supplier_purchases WHERE id = ? AND shop_id = ?`,
    id,
    shopId,
  );
  if (!row) throw new Error("Purchase record nahi mila.");
  if (Date.now() - new Date(row.inserted_at || row.created_at).getTime() > UNDO_MS) throw new Error("Undo ka time nikal gaya.");
  await db.run(`DELETE FROM supplier_purchases WHERE id = ? AND shop_id = ?`, id, shopId);
}

export async function getLastPurchaseForItem(shopId: string, itemQuery: string): Promise<SupplierPurchaseRow | null> {
  const db = await getDb();
  const q = `%${itemQuery.trim().toLowerCase()}%`;
  return db.get<SupplierPurchaseRow>(
    `SELECT * FROM supplier_purchases WHERE shop_id = ? AND lower(items_text) LIKE ? ORDER BY created_at DESC LIMIT 1`,
    shopId,
    q,
  );
}

export interface DailyCashSummary {
  date: string;
  cashIn: number;
  cashOut: number;
  netCash: number;
  breakdown: {
    paymentsReceived: number;
    rentCollected: number;
    billsPaid: number;
    supplierPurchasesPaid: number;
    udhaarGiven: number;
  };
  udhaarGiven: number;
  paymentsReceived: number;
  rentCollected: number;
  billsPaid: number;
}

export async function getDailyCashSummary(shopId: string, dateStr = getIstTodayString()): Promise<DailyCashSummary> {
  const db = await getDb();
  const prefix = dateStr.slice(0, 10);

  const udhaarRow = await db.get<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM entries WHERE shop_id = ? AND type = 'udhaar' AND substr(created_at, 1, 10) = ?`,
    shopId,
    prefix,
  );
  const udhaarGiven = Number(udhaarRow?.total) || 0;

  const paymentsRow = await db.get<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM entries WHERE shop_id = ? AND type = 'payment' AND substr(created_at, 1, 10) = ?`,
    shopId,
    prefix,
  );
  const paymentsReceived = Number(paymentsRow?.total) || 0;

  const rentRow = await db.get<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM rental_payments WHERE shop_id = ? AND substr(payment_date, 1, 10) = ?`,
    shopId,
    prefix,
  );
  const rentCollected = Number(rentRow?.total) || 0;

  const billsRow = await db.get<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM shop_records WHERE shop_id = ? AND status = 'paid' AND substr(created_at, 1, 10) = ?`,
    shopId,
    prefix,
  );
  const billsPaid = Number(billsRow?.total) || 0;

  const supplierRow = await db.get<{ total: number | null }>(
    `SELECT SUM(amount) AS total FROM supplier_purchases WHERE shop_id = ? AND status = 'paid' AND substr(created_at, 1, 10) = ?`,
    shopId,
    prefix,
  );
  const supplierPurchasesPaid = Number(supplierRow?.total) || 0;

  const cashIn = paymentsReceived + rentCollected;
  const cashOut = billsPaid + supplierPurchasesPaid;
  const netCash = cashIn - cashOut;

  return {
    date: prefix,
    cashIn,
    cashOut,
    netCash,
    breakdown: {
      paymentsReceived,
      rentCollected,
      billsPaid,
      supplierPurchasesPaid,
      udhaarGiven,
    },
    udhaarGiven,
    paymentsReceived,
    rentCollected,
    billsPaid,
  };
}

export interface SearchResultItem {
  id: string;
  type: "customer" | "asset" | "agreement" | "record" | "memory" | "supplier";
  title: string;
  subtitle: string;
  link: string;
}

export async function searchEverywhere(shopId: string, query: string): Promise<SearchResultItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const db = await getDb();
  const likeParam = `%${q}%`;

  const [customers, assets, agreements, records, memory, purchases] = await Promise.all([
    db.all<{ id: string; name: string; phone: string | null }>(
      `SELECT id, name, phone FROM customers WHERE shop_id = ? AND (lower(name) LIKE ? OR phone LIKE ?) LIMIT 8`,
      shopId,
      likeParam,
      likeParam,
    ),
    db.all<{ id: string; name: string; type: string; rate: number }>(
      `SELECT id, name, type, rate FROM rental_assets WHERE shop_id = ? AND lower(name) LIKE ? LIMIT 8`,
      shopId,
      likeParam,
    ),
    db.all<{ id: string; asset_name: string; customer_name: string }>(
      `SELECT ra.id, a.name AS asset_name, c.name AS customer_name
       FROM rental_agreements ra
       JOIN rental_assets a ON a.id = ra.asset_id
       JOIN customers c ON c.id = ra.customer_id
       WHERE ra.shop_id = ? AND (lower(a.name) LIKE ? OR lower(c.name) LIKE ?) LIMIT 8`,
      shopId,
      likeParam,
      likeParam,
    ),
    db.all<{ id: string; kind: string; label: string; party: string | null; amount: number }>(
      `SELECT id, kind, label, party, amount FROM shop_records WHERE shop_id = ? AND (lower(label) LIKE ? OR lower(party) LIKE ?) LIMIT 8`,
      shopId,
      likeParam,
      likeParam,
    ),
    db.all<{ customer_id: string; name: string; user_note: string | null }>(
      `SELECT customer_id, name, user_note FROM memory_nodes WHERE shop_id = ? AND (lower(name) LIKE ? OR lower(user_note) LIKE ?) LIMIT 8`,
      shopId,
      likeParam,
      likeParam,
    ),
    db.all<{ id: string; supplier_name: string; items_text: string; amount: number }>(
      `SELECT id, supplier_name, items_text, amount FROM supplier_purchases WHERE shop_id = ? AND (lower(supplier_name) LIKE ? OR lower(items_text) LIKE ?) LIMIT 8`,
      shopId,
      likeParam,
      likeParam,
    ),
  ]);

  const results: SearchResultItem[] = [];

  for (const c of customers) {
    results.push({
      id: c.id,
      type: "customer",
      title: c.name,
      subtitle: c.phone || "Grahak",
      link: `/app/grahak/${c.id}`,
    });
  }

  for (const a of assets) {
    results.push({
      id: a.id,
      type: "asset",
      title: a.name,
      subtitle: `${a.type} · ₹${a.rate}`,
      link: `/app/rentals`,
    });
  }

  for (const ag of agreements) {
    results.push({
      id: ag.id,
      type: "agreement",
      title: `${ag.asset_name} - ${ag.customer_name}`,
      subtitle: "Kiraya Agreement",
      link: `/app/rentals`,
    });
  }

  for (const r of records) {
    results.push({
      id: r.id,
      type: "record",
      title: r.label,
      subtitle: `${r.kind === "rent" ? "Kiraya" : "Bill"} · ₹${r.amount}${r.party ? ` · ${r.party}` : ""}`,
      link: r.kind === "rent" ? `/app/kiraya` : `/app/bills`,
    });
  }

  for (const m of memory) {
    if (m.user_note) {
      results.push({
        id: m.customer_id,
        type: "memory",
        title: m.name,
        subtitle: m.user_note,
        link: `/app/settings`,
      });
    }
  }

  for (const p of purchases) {
    results.push({
      id: p.id,
      type: "supplier",
      title: p.supplier_name,
      subtitle: `${p.items_text} · ₹${p.amount}`,
      link: `/app/suppliers`,
    });
  }

  return results;
}

export interface SampleDataCounts {
  hasSample: boolean;
  customers: number;
  entries: number;
  records: number;
  assets: number;
  agreements: number;
  purchases: number;
  total: number;
}

export async function getSampleDataCounts(shopId: string): Promise<SampleDataCounts> {
  const db = await getDb();
  const [custRow, entryRow, recordRow, assetRow, agreeRow, purRow] = await Promise.all([
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')`, shopId),
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM entries WHERE shop_id = ? AND (is_sample = 1 OR customer_id IN (SELECT id FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')))`, shopId, shopId),
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM shop_records WHERE shop_id = ? AND is_sample = 1`, shopId),
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM rental_assets WHERE shop_id = ? AND is_sample = 1`, shopId),
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM rental_agreements WHERE shop_id = ? AND is_sample = 1`, shopId),
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM supplier_purchases WHERE shop_id = ? AND is_sample = 1`, shopId),
  ]);

  const customers = Number(custRow?.count) || 0;
  const entries = Number(entryRow?.count) || 0;
  const records = Number(recordRow?.count) || 0;
  const assets = Number(assetRow?.count) || 0;
  const agreements = Number(agreeRow?.count) || 0;
  const purchases = Number(purRow?.count) || 0;
  const total = customers + entries + records + assets + agreements + purchases;

  return {
    hasSample: total > 0,
    customers,
    entries,
    records,
    assets,
    agreements,
    purchases,
    total,
  };
}

export async function hasSampleData(shopId: string): Promise<boolean> {
  const counts = await getSampleDataCounts(shopId);
  return counts.hasSample;
}

export async function clearSampleData(shopId: string): Promise<{ deleted: boolean; counts: SampleDataCounts }> {
  const db = await getDb();
  const beforeCounts = await getSampleDataCounts(shopId);

  // 1. Delete rental payments for sample agreements or sample customers
  await db.run(
    `DELETE FROM rental_payments WHERE shop_id = ? AND (is_sample = 1 OR agreement_id IN (SELECT id FROM rental_agreements WHERE shop_id = ? AND is_sample = 1) OR customer_id IN (SELECT id FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')))`,
    shopId,
    shopId,
    shopId,
  );

  // 2. Delete rental agreements
  await db.run(
    `DELETE FROM rental_agreements WHERE shop_id = ? AND (is_sample = 1 OR customer_id IN (SELECT id FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')))`,
    shopId,
    shopId,
  );

  // 3. Delete rental assets
  await db.run(
    `DELETE FROM rental_assets WHERE shop_id = ? AND is_sample = 1`,
    shopId,
  );

  // 4. Delete supplier purchases
  await db.run(
    `DELETE FROM supplier_purchases WHERE shop_id = ? AND is_sample = 1`,
    shopId,
  );

  // 5. Delete shop records (bills, rent paid)
  await db.run(
    `DELETE FROM shop_records WHERE shop_id = ? AND is_sample = 1`,
    shopId,
  );

  // 6. Delete ledger entries
  await db.run(
    `DELETE FROM entries WHERE shop_id = ? AND (is_sample = 1 OR customer_id IN (SELECT id FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')))`,
    shopId,
    shopId,
  );

  // 7. Delete memory nodes
  await db.run(
    `DELETE FROM memory_nodes WHERE shop_id = ? AND (phone LIKE '90000%' OR customer_id IN (SELECT id FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')))`,
    shopId,
    shopId,
  );

  // 8. Delete sample customers
  await db.run(
    `DELETE FROM customers WHERE shop_id = ? AND (is_sample = 1 OR phone LIKE '90000%')`,
    shopId,
  );

  // 9. Recompute remaining customers' balances to ensure ledger consistency
  const remaining = await db.all<{ id: string }>(`SELECT id FROM customers WHERE shop_id = ?`, shopId);
  for (const c of remaining) {
    await recompute(db, shopId, c.id);
  }

  return { deleted: true, counts: beforeCounts };
}


