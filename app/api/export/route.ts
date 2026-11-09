import { bad, isShop, requireShop } from "@/lib/api";
import { getIstTodayString } from "@/lib/rentals-math";
import {
  listCustomers,
  listEntries,
  listRecords,
  listRentalAgreements,
  listRentalAssets,
  listRentalPayments,
  listSupplierPurchases,
} from "@/lib/repo";

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const head = headers.map(escapeCsv).join(",");
  const body = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
  return `${head}\n${body}`;
}

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;

  const url = new URL(request.url);
  const book = url.searchParams.get("book") || "udhaar";
  const today = getIstTodayString();

  let csv = "";
  let filename = `bolkhata_${book}_${today}.csv`;

  if (book === "udhaar") {
    const entries = await listEntries(shop.id, "udhaar");
    csv = toCsv(
      ["Date", "Customer Name", "Phone", "Amount", "Note", "Running Balance", "Due Date"],
      entries.map((e) => [e.created_at, e.customer_name, e.customer_phone, e.amount, e.note, e.running_balance, e.due_date]),
    );
  } else if (book === "jama") {
    const entries = await listEntries(shop.id, "payment");
    csv = toCsv(
      ["Date", "Customer Name", "Phone", "Amount", "Note", "Running Balance"],
      entries.map((e) => [e.created_at, e.customer_name, e.customer_phone, e.amount, e.note, e.running_balance]),
    );
  } else if (book === "customers") {
    const customers = await listCustomers(shop.id);
    csv = toCsv(
      ["Customer Name", "Phone", "Balance", "Credit Limit", "Created At"],
      customers.map((c) => [c.name, c.phone, c.balance, c.credit_limit, c.created_at]),
    );
  } else if (book === "rentals") {
    const [assets, agreements, payments] = await Promise.all([
      listRentalAssets(shop.id),
      listRentalAgreements(shop.id),
      listRentalPayments(shop.id),
    ]);
    const agreementLines = agreements.map((a) => [
      a.asset_name,
      a.asset_type,
      a.customer_name,
      a.customer_phone,
      a.start_date,
      a.end_date,
      a.actual_return_date,
      a.rate,
      a.rate_period,
      a.deposit_taken,
      a.deposit_returned,
      a.deposit_deductions,
      a.status,
      a.notes,
    ]);
    csv = toCsv(
      [
        "Asset Name",
        "Asset Type",
        "Renter Name",
        "Renter Phone",
        "Start Date",
        "End Date",
        "Actual Return Date",
        "Rate",
        "Period",
        "Deposit Taken",
        "Deposit Returned",
        "Deposit Deductions",
        "Status",
        "Notes",
      ],
      agreementLines,
    );
  } else if (book === "bills" || book === "kiraya_diya") {
    const kind = book === "kiraya_diya" ? "rent" : undefined;
    const records = await listRecords(shop.id, kind);
    csv = toCsv(
      ["Date", "Label", "Kind", "Category", "Amount", "Status", "Party", "Period", "Note", "Is Recurring"],
      records.map((r) => [r.created_at, r.label, r.kind, r.bill_kind, r.amount, r.status, r.party, r.period, r.note, r.is_recurring ? "Yes" : "No"]),
    );
  } else if (book === "suppliers") {
    const purchases = await listSupplierPurchases(shop.id);
    csv = toCsv(
      ["Date", "Supplier Name", "Supplier Phone", "Items", "Amount", "Status", "Note"],
      purchases.map((p) => [p.created_at, p.supplier_name, p.supplier_phone, p.items_text, p.amount, p.status, p.note]),
    );
  } else {
    return bad("Galat book chuni. Options: udhaar, jama, customers, rentals, bills, suppliers.");
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
