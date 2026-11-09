import { isShop, requireShop } from "@/lib/api";
import {
  SAMPLE_LINES,
  SAMPLE_PEOPLE,
  SAMPLE_RECORDS,
  SAMPLE_RENTAL_AGREEMENTS,
  SAMPLE_RENTAL_ASSETS,
  SAMPLE_SUPPLIER_PURCHASES,
  sampleLineKey,
  sampleRecordKey,
  sampleStatus,
} from "@/lib/sample-data";
import {
  addEntry,
  addRentalPayment,
  addRecord,
  createCustomer,
  createRentalAgreement,
  createRentalAsset,
  createSupplierPurchase,
  listCustomers,
  listEntries,
  listRecords,
  listRentalAgreements,
  listRentalAssets,
  listSupplierPurchases,
} from "@/lib/repo";

const sampleLocks = new Map<string, Promise<unknown>>();

/** Fictional demo rows. A second call does not insert the same line again. */
export async function POST() {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const previous = sampleLocks.get(shop.id) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  sampleLocks.set(shop.id, previous.then(() => gate));
  await previous;
  try {
    return await loadSample(shop.id);
  } finally {
    release();
  }
}

async function loadSample(shopId: string) {
  const [customers, entries, records, assets, agreements, purchases] = await Promise.all([
    listCustomers(shopId),
    listEntries(shopId),
    listRecords(shopId),
    listRentalAssets(shopId),
    listRentalAgreements(shopId),
    listSupplierPurchases(shopId),
  ]);

  const status = sampleStatus({
    customers,
    entries: entries.map((entry) => ({
      customerName: entry.customer_name,
      customerPhone: entry.customer_phone,
      type: entry.type,
      amount: Number(entry.amount),
      note: entry.note,
    })),
    records: records.map((record) => ({ kind: record.kind, party: record.party, amount: Number(record.amount) })),
  });

  const byPhone = new Map(customers.filter((customer) => customer.phone).map((customer) => [customer.phone as string, customer.id]));
  for (const person of SAMPLE_PEOPLE) {
    if (byPhone.has(person.phone)) continue;
    const created = await createCustomer(shopId, person);
    byPhone.set(person.phone, created.id);
  }
  const idByName = new Map(SAMPLE_PEOPLE.map((person) => [person.name.toLowerCase(), byPhone.get(person.phone) ?? ""]));
  const haveLines = new Set(
    entries
      .filter((entry) => SAMPLE_PEOPLE.some((person) => person.phone === (entry.customer_phone ?? "").replace(/\D/g, "") && person.name.toLowerCase() === entry.customer_name.trim().toLowerCase()))
      .map((entry) => sampleLineKey({ name: entry.customer_name, type: entry.type, amount: Number(entry.amount), note: entry.note })),
  );
  for (const line of SAMPLE_LINES) {
    const key = sampleLineKey(line);
    if (haveLines.has(key)) continue;
    const customerId = idByName.get(line.name.toLowerCase());
    if (!customerId) continue;
    await addEntry(shopId, { customerId, type: line.type, amount: line.amount, note: line.note || null, createdAt: line.createdAt });
    haveLines.add(key);
  }
  const haveRecords = new Set(records.map((record) => sampleRecordKey({ kind: record.kind, party: record.party, amount: Number(record.amount) })));
  for (const record of SAMPLE_RECORDS) {
    const key = sampleRecordKey(record);
    if (haveRecords.has(key)) continue;
    await addRecord(shopId, record);
    haveRecords.add(key);
  }

  // Idempotently load sample rental assets
  const assetByName = new Map(assets.map((a) => [a.name.toLowerCase(), a.id]));
  for (const sampleAsset of SAMPLE_RENTAL_ASSETS) {
    if (assetByName.has(sampleAsset.name.toLowerCase())) continue;
    const created = await createRentalAsset(shopId, {
      name: sampleAsset.name,
      type: sampleAsset.type,
      description: sampleAsset.description,
      rate: sampleAsset.rate,
      ratePeriod: sampleAsset.ratePeriod,
      securityDeposit: sampleAsset.securityDeposit,
      notes: sampleAsset.notes,
    });
    assetByName.set(sampleAsset.name.toLowerCase(), created.id);
  }

  // Idempotently load sample rental agreements
  const haveAgreements = new Set(agreements.map((ag) => `${ag.asset_name.toLowerCase()}|${ag.customer_name.toLowerCase()}`));
  for (const sampleAg of SAMPLE_RENTAL_AGREEMENTS) {
    const key = `${sampleAg.assetName.toLowerCase()}|${sampleAg.customerName.toLowerCase()}`;
    if (haveAgreements.has(key)) continue;
    const assetId = assetByName.get(sampleAg.assetName.toLowerCase());
    const customerId = idByName.get(sampleAg.customerName.toLowerCase());
    if (!assetId || !customerId) continue;
    const createdAg = await createRentalAgreement(shopId, {
      assetId,
      customerId,
      startDate: sampleAg.startDate,
      endDate: "endDate" in sampleAg ? sampleAg.endDate : null,
      rate: sampleAg.rate,
      ratePeriod: sampleAg.ratePeriod,
      depositTaken: sampleAg.depositTaken,
      dueDay: "dueDay" in sampleAg ? sampleAg.dueDay : null,
      notes: sampleAg.notes,
    });
    haveAgreements.add(key);

    // If Sita Devi's room rental, add sample October rent payment
    if (sampleAg.customerName === "Sita Devi") {
      await addRentalPayment(shopId, {
        agreementId: createdAg.id,
        amount: 5000,
        paymentDate: "2026-10-05",
        mode: "cash",
        note: "October rent payment",
      });
    }
  }

  // Idempotently load sample supplier purchases
  const havePurchases = new Set(purchases.map((p) => `${p.supplier_name.toLowerCase()}|${p.items_text.toLowerCase()}`));
  for (const sp of SAMPLE_SUPPLIER_PURCHASES) {
    const key = `${sp.supplierName.toLowerCase()}|${sp.itemsText.toLowerCase()}`;
    if (havePurchases.has(key)) continue;
    await createSupplierPurchase(shopId, {
      supplierName: sp.supplierName,
      supplierPhone: sp.supplierPhone,
      itemsText: sp.itemsText,
      amount: sp.amount,
      status: sp.status,
      note: sp.note,
    });
    havePurchases.add(key);
  }

  return Response.json({ ok: true, already: status.complete && assets.length > 0 });
}
