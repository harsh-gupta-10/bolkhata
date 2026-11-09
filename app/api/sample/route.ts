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
  clearSampleData,
  createCustomer,
  createRentalAgreement,
  createRentalAsset,
  createSupplierPurchase,
  getSampleDataCounts,
  listCustomers,
  listEntries,
  listRecords,
  listRentalAgreements,
  listRentalAssets,
  listRentalPayments,
  listSupplierPurchases,
} from "@/lib/repo";

const sampleLocks = new Map<string, Promise<unknown>>();

/** Get current status and counts of sample data for this shop */
export async function GET() {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const counts = await getSampleDataCounts(shop.id);
  return Response.json({ ok: true, hasSample: counts.hasSample, counts });
}

/** Clear all sample data so the shopkeeper can go live */
export async function DELETE() {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const result = await clearSampleData(shop.id);
  return Response.json({ ok: true, removed: true, counts: result.counts });
}

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
  const [customers, entries, records, assets, agreements, purchases, existingPayments] = await Promise.all([
    listCustomers(shopId),
    listEntries(shopId),
    listRecords(shopId),
    listRentalAssets(shopId),
    listRentalAgreements(shopId),
    listSupplierPurchases(shopId),
    listRentalPayments(shopId),
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

  // 1. Customers
  const byPhone = new Map(customers.filter((customer) => customer.phone).map((customer) => [customer.phone as string, customer.id]));
  for (const person of SAMPLE_PEOPLE) {
    if (byPhone.has(person.phone)) continue;
    const created = await createCustomer(shopId, { ...person, isSample: 1 });
    byPhone.set(person.phone, created.id);
  }
  const idByName = new Map(SAMPLE_PEOPLE.map((person) => [person.name.toLowerCase(), byPhone.get(person.phone) ?? ""]));

  // 2. Entries
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
    await addEntry(shopId, {
      customerId,
      type: line.type,
      amount: line.amount,
      note: line.note || null,
      createdAt: line.createdAt,
      dueDate: "dueDate" in line ? line.dueDate : null,
      isSample: 1,
    });
    haveLines.add(key);
  }

  // 3. Shop Records (Rent Paid, Bills)
  const haveRecords = new Set(records.map((record) => sampleRecordKey({ kind: record.kind, party: record.party, amount: Number(record.amount) })));
  for (const record of SAMPLE_RECORDS) {
    const key = sampleRecordKey(record);
    if (haveRecords.has(key)) continue;
    await addRecord(shopId, { ...record, isSample: 1 });
    haveRecords.add(key);
  }

  // 4. Rental Assets
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
      isSample: 1,
    });
    assetByName.set(sampleAsset.name.toLowerCase(), created.id);
  }

  // 5. Rental Agreements
  const agreementMap = new Map(agreements.map((ag) => [`${ag.asset_name.toLowerCase()}|${ag.customer_name.toLowerCase()}`, ag.id]));
  for (const sampleAg of SAMPLE_RENTAL_AGREEMENTS) {
    const key = `${sampleAg.assetName.toLowerCase()}|${sampleAg.customerName.toLowerCase()}`;
    let agreementId = agreementMap.get(key);
    if (!agreementId) {
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
        isSample: 1,
      });
      agreementId = createdAg.id;
      agreementMap.set(key, agreementId);
    }

    // Rental payments for agreements (idempotent check)
    const paidDates = new Set(existingPayments.filter((p) => p.agreement_id === agreementId).map((p) => p.payment_date));

    if (sampleAg.customerName === "Sita Devi") {
      if (!paidDates.has("2026-10-05")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 5000,
          paymentDate: "2026-10-05",
          mode: "cash",
          note: "October rent payment",
          isSample: 1,
        });
        paidDates.add("2026-10-05");
      }
      if (!paidDates.has("2026-11-05")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 5000,
          paymentDate: "2026-11-05",
          mode: "UPI",
          note: "November rent payment",
          isSample: 1,
        });
        paidDates.add("2026-11-05");
      }
    } else if (sampleAg.customerName === "Rajesh Sharma") {
      if (!paidDates.has("2026-09-02")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 12000,
          paymentDate: "2026-09-02",
          mode: "UPI",
          note: "September godown rent",
          isSample: 1,
        });
        paidDates.add("2026-09-02");
      }
      if (!paidDates.has("2026-10-04")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 6000,
          paymentDate: "2026-10-04",
          mode: "cash",
          note: "October partial payment (baaki overdue)",
          isSample: 1,
        });
        paidDates.add("2026-10-04");
      }
    } else if (sampleAg.customerName === "Vikram Singh") {
      if (!paidDates.has("2026-10-22")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 800,
          paymentDate: "2026-10-22",
          mode: "cash",
          note: "Week 1 freezer rental",
          isSample: 1,
        });
        paidDates.add("2026-10-22");
      }
      if (!paidDates.has("2026-10-29")) {
        await addRentalPayment(shopId, {
          agreementId,
          amount: 800,
          paymentDate: "2026-10-29",
          mode: "UPI",
          note: "Week 2 freezer rental",
          isSample: 1,
        });
        paidDates.add("2026-10-29");
      }
    }
  }

  // 6. Supplier Purchases
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
      isSample: 1,
    });
    havePurchases.add(key);
  }

  const finalCounts = await getSampleDataCounts(shopId);
  return Response.json({ ok: true, already: status.complete && assets.length > 0, counts: finalCounts });
}
