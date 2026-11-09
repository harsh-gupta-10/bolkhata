import { bad, isShop, requireShop } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { extractWithOpenAI } from "@/lib/openai";
import { compactMemory, pickMainContacts } from "@/lib/product";
import {
  listCustomers,
  listMemory,
  listMessages,
  listRecords,
  listRentalAgreements,
  listRentalAssets,
  listRentalPayments,
} from "@/lib/repo";
import { computeAgreementFinancials } from "@/lib/rentals-math";
import { prepareTurn } from "@/lib/understand";

/** Reads a chat line. Does not write the ledger. Confirm still has to happen in the app. */
export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if (text.length < 1 || text.length > 500) return bad("Ek chhoti line likho.");

  const [customers, records, memory, messages, assets, agreements, rentalPayments] = await Promise.all([
    listCustomers(shop.id),
    listRecords(shop.id),
    listMemory(shop.id),
    listMessages(shop.id),
    listRentalAssets(shop.id),
    listRentalAgreements(shop.id),
    listRentalPayments(shop.id),
  ]);

  const isOverdueRentQuery =
    /(kiska|kis-kiska|who owes)\s+(kiraya|rent).*(baaki|baki|overdue)/i.test(text) ||
    /(kiraya|rent)\s+(kiska).*(baaki|baki)/i.test(text) ||
    /^(kiska|kis-kiska)\s+(kiraya|rent)\s+(baaki|baki)/i.test(text) ||
    /(किसका|किराया किसका).*(बाकी|बकाया)/i.test(text);

  if (isOverdueRentQuery) {
    const overdueList: string[] = [];
    for (const ag of agreements) {
      if (ag.status === "ended") continue;
      const fin = computeAgreementFinancials(ag, rentalPayments.filter((p) => p.agreement_id === ag.id));
      if (fin.overdue && fin.pending > 0) {
        const cust = customers.find((c) => c.id === ag.customer_id);
        const asset = assets.find((a) => a.id === ag.asset_id);
        overdueList.push(`${cust?.name ?? "Kirayedaar"} (${asset?.name ?? "Asset"}): ₹${fin.pending} (${fin.overdueDays} din overdue)`);
      }
    }
    const reply =
      overdueList.length > 0
        ? `Baaki kiraya: ${overdueList.join(", ")}.`
        : "Abhi kisi bhi kirayedaar ka kiraya baaki nahi hai.";
    return Response.json({
      ok: true,
      source: "parser",
      mode: "reply",
      reply,
    });
  }

  const main = pickMainContacts(
    customers.map((customer) => ({ ...customer, balance: Number(customer.balance) || 0 })),
    memory.map((node) => node.customer_id),
  );
  const named = customers.map((customer) => ({ id: customer.id, name: customer.name }));
  const prepared = await prepareTurn({
    text,
    customers: named,
    extract: () =>
      extractWithOpenAI(text, {
        locale: normalizeLocale(shop.locale),
        udhaarOutstanding: customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance) || 0), 0),
        rentDue: records.filter((record) => record.kind === "rent" && record.status === "due").reduce((sum, record) => sum + Number(record.amount), 0),
        billsDue: records.filter((record) => record.kind === "bill" && record.status === "due").reduce((sum, record) => sum + Number(record.amount), 0),
        customers: main.map((customer) => ({ name: customer.name, phone: customer.phone, balance: Number(customer.balance) || 0 })),
        memory: compactMemory(memory.map((node) => ({ name: node.name, phone: node.phone, balance: Number(node.balance) || 0, lastAmount: node.last_amount, lastNote: node.last_note, lastIntent: node.last_intent }))),
        recent: messages.slice(-8).map((message) => `${message.role}: ${message.text}`).join("\n"),
      }),
  });
  return Response.json(prepared);
}

