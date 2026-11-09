import { matchCustomers } from "@/lib/match";
import type { InterpretResult } from "@/lib/parser";
import type { Customer, DraftCard, DraftIntent } from "@/lib/types";

export function indiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function blankCard(intent: DraftIntent, date = indiaToday()): DraftCard {
  return {
    status: "open",
    intent,
    name: "",
    phone: "",
    ambiguous: [],
    amount: "",
    note: "",
    date,
    shopStatus: "due",
    billKind: intent === "bill" ? "bijli" : "other",
    label: intent === "rent" ? "Kiraya" : intent === "bill" ? "Bijli" : "",
  };
}

export function cardFromResult(result: Extract<InterpretResult, { ok: true }>, customers: Customer[]): DraftCard {
  const date = "spokenDate" in result && result.spokenDate ? result.spokenDate : indiaToday();
  const cardIntent: DraftIntent = result.intent === "rent_overdue_query" ? "balance" : result.intent;
  const card = blankCard(cardIntent, date);
  if (result.intent === "add_customer") {
    return { ...card, name: result.name, phone: prettyPhone(result.phone) };
  }
  if (result.intent === "rent" || result.intent === "bill") {
    return {
      ...card,
      amount: String(result.amount),
      note: result.note ?? "",
      shopStatus: result.status,
      billKind: result.billKind,
      label: result.label,
    };
  }
  if (result.intent === "rent_overdue_query") {
    return { ...card, label: "Kiraya Baaki", hint: "Kiska kiraya baaki hai" };
  }
  if (result.intent === "start_rental" || result.intent === "return_rental" || result.intent === "rent_received") {
    const matchedPeople = "match" in result && result.match ? result.match : undefined;
    const ambiguous =
      matchedPeople?.status === "many"
        ? matchedPeople.customers.map((candidate: { id: string; name: string }) => {
            const full = customers.find((customer) => customer.id === candidate.id);
            return { id: candidate.id, name: full?.name ?? candidate.name, balance: full?.balance ?? 0 };
          })
        : [];
    const matched = matchedPeople?.status === "one" ? customers.find((customer) => customer.id === matchedPeople.customer.id) : undefined;
    const amountVal = "amount" in result ? String(result.amount) : "rate" in result ? String(result.rate) : "";
    return {
      ...card,
      name: matched?.name ?? ("customerQuery" in result ? (result.customerQuery ?? "") : ""),
      phone: prettyPhone(matched?.phone ?? ("phone" in result ? result.phone : undefined)),
      customerId: matched?.id,
      ambiguous,
      amount: amountVal,
      note: "note" in result && result.note ? result.note : "",
      label: "assetQuery" in result && result.assetQuery ? result.assetQuery : "Kiraya Mila",
    };
  }
  const matchedPeople = result.match;
  const ambiguous =
    matchedPeople.status === "many"
      ? matchedPeople.customers.map((candidate: { id: string; name: string }) => {
          const full = customers.find((customer) => customer.id === candidate.id);
          return { id: candidate.id, name: full?.name ?? candidate.name, balance: full?.balance ?? 0 };
        })
      : [];
  const matched = matchedPeople.status === "one" ? customers.find((customer) => customer.id === matchedPeople.customer.id) : undefined;
  return {
    ...card,
    name: matched?.name ?? result.customerQuery,
    phone: prettyPhone(matched?.phone),
    customerId: matched?.id,
    ambiguous,
    amount: result.intent === "balance" ? "" : String(result.amount),
    note: result.intent === "balance" ? "" : (result.note ?? ""),
    hint:
      matchedPeople.status === "many"
        ? "Kaunsa wala? Naam chuno."
        : matchedPeople.status === "none"
          ? "Yeh naam abhi khate mein nahi hai."
          : undefined,
  };
}

export function cardToResult(card: DraftCard, customers: Customer[]): InterpretResult {
  const raw = "";
  if (card.intent === "add_customer") {
    const phone = digits(card.phone);
    return { ok: true, intent: "add_customer", name: card.name.trim(), phone: phone.length === 10 ? phone : undefined, raw };
  }
  if (card.intent === "rent" || card.intent === "bill") {
    const amount = Number(card.amount.replace(/[^\d]/g, ""));
    return {
      ok: true,
      intent: card.intent,
      amount,
      note: card.note.trim() || undefined,
      status: card.shopStatus,
      billKind: card.billKind,
      label: card.label.trim() || (card.intent === "rent" ? "Kiraya" : "Bill"),
      spokenDate: card.date,
      raw,
    };
  }
  const amount = Number(card.amount.replace(/[^\d]/g, ""));
  const match = card.customerId
    ? { status: "one" as const, customer: { id: card.customerId, name: card.name } }
    : matchCustomers(card.name, customers);
  if (card.intent === "balance") {
    return { ok: true, intent: "balance", customerQuery: card.name.trim(), match, spokenDate: card.date, raw };
  }
  if (card.intent === "rent_received") {
    return {
      ok: true,
      intent: "rent_received",
      customerQuery: card.name.trim(),
      amount,
      note: card.note.trim() || undefined,
      match,
      raw,
    };
  }
  if (card.intent === "start_rental") {
    return {
      ok: true,
      intent: "start_rental",
      assetQuery: card.label || "asset",
      customerQuery: card.name.trim(),
      rate: amount,
      ratePeriod: card.ratePeriod || "per_day",
      note: card.note.trim() || undefined,
      match,
      raw,
    };
  }
  if (card.intent === "return_rental") {
    return {
      ok: true,
      intent: "return_rental",
      assetQuery: card.label || "asset",
      customerQuery: card.name.trim() || undefined,
      match,
      raw,
    };
  }
  if (card.intent === "supplier_purchase") {
    return {
      ok: true,
      intent: "bill",
      amount,
      note: card.note.trim() || undefined,
      status: card.shopStatus,
      billKind: "other",
      label: card.supplierName || "Supplier",
      raw,
    };
  }
  return {
    ok: true,
    intent: card.intent,
    customerQuery: card.name.trim(),
    amount,
    note: card.note.trim() || undefined,
    match,
    spokenDate: card.date,
    raw,
  };
}

export function prettyPhone(phone?: string): string {
  const value = digits(phone ?? "");
  if (value.length !== 10) return phone ?? "";
  return `${value.slice(0, 5)} ${value.slice(5)}`;
}

export function digits(phone: string): string {
  const value = phone.replace(/\D/g, "");
  return value.length > 10 ? value.slice(-10) : value;
}

export function stampFromDate(date: string, fallback: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fallback;
  return `${date}T12:00:00+05:30`;
}
