import { interpret, type InterpretResult } from "@/lib/parser";
import type { NamedPerson } from "@/lib/match";

export type LedgerIntent =
  | "udhaar"
  | "payment"
  | "balance"
  | "rent"
  | "bill"
  | "add_customer"
  | "rent_received"
  | "start_rental"
  | "return_rental";

export interface LlmExtraction {
  intent: LedgerIntent | "reply" | "unknown";
  name: string;
  phone: string;
  amount: number | null;
  note: string;
  date: string;
  status: "due" | "paid" | "";
  billKind: "bijli" | "paani" | "other" | "";
  label: string;
  party: string;
  period: string;
  reply: string;
  assetQuery?: string;
  days?: number;
  rate?: number;
  ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
}

export type TurnSource = "openai" | "parser";

export type PreparedTurn =
  | { ok: false; source: TurnSource; raw: string }
  | { ok: true; source: TurnSource; mode: "reply"; reply: string }
  | {
      ok: true;
      source: TurnSource;
      mode: "action";
      intent: LedgerIntent;
      name: string;
      phone: string;
      amount: number | null;
      note: string;
      date: string;
      status: "due" | "paid";
      billKind: "bijli" | "paani" | "other";
      label: string;
      party: string;
      period: string;
      assetQuery?: string;
      days?: number;
      rate?: number;
      ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
    };

/** Model JSON is only a draft. It never means the ledger was written. */
export function prepareFromExtraction(text: string, extraction: LlmExtraction): PreparedTurn | null {
  if (!usable(extraction)) return null;
  if (extraction.intent === "reply") {
    return { ok: true, source: "openai", mode: "reply", reply: extraction.reply.trim().slice(0, 400) };
  }
  if (extraction.intent === "unknown") return null;
  const intent = extraction.intent;
  return {
    ok: true,
    source: "openai",
    mode: "action",
    intent,
    name: extraction.name.trim().slice(0, 80),
    phone: extraction.phone.trim().slice(0, 20),
    amount: positiveAmount(extraction.amount),
    note: extraction.note.trim().slice(0, 160),
    date: isoDate(extraction.date),
    status: extraction.status === "paid" ? "paid" : "due",
    billKind: extraction.billKind === "bijli" || extraction.billKind === "paani" ? extraction.billKind : "other",
    label: extraction.label.trim().slice(0, 40) || defaultLabel(intent, extraction.billKind),
    party: extraction.party.trim().slice(0, 80),
    period: extraction.period.trim().slice(0, 40),
  };
}

export function prepareFromParser(text: string, customers: NamedPerson[]): PreparedTurn {
  const result = interpret(text, customers);
  if (!result.ok) return { ok: false, source: "parser", raw: text };
  return fromInterpret(result);
}

/**
 * Prefer a structured model read. Missing key, timeout, bad JSON, or an unusable
 * extraction all land on the in-app parser.
 */
export async function prepareTurn(input: {
  text: string;
  customers: NamedPerson[];
  extract: (() => Promise<LlmExtraction | null>) | null;
}): Promise<PreparedTurn> {
  if (input.extract) {
    try {
      const extraction = await input.extract();
      if (extraction) {
        const prepared = prepareFromExtraction(input.text, extraction);
        if (prepared) return prepared;
      }
    } catch {
      /* parser below */
    }
  }
  return prepareFromParser(input.text, input.customers);
}

export function emptyExtraction(partial: Partial<LlmExtraction> = {}): LlmExtraction {
  return {
    intent: "unknown",
    name: "",
    phone: "",
    amount: null,
    note: "",
    date: "",
    status: "",
    billKind: "",
    label: "",
    party: "",
    period: "",
    reply: "",
    ...partial,
  };
}

function usable(extraction: LlmExtraction): boolean {
  if (extraction.intent === "unknown") return false;
  if (extraction.intent === "reply") return extraction.reply.trim().length > 0;
  if (extraction.intent === "udhaar" || extraction.intent === "payment") {
    return extraction.name.trim().length >= 2 && (positiveAmount(extraction.amount) ?? 0) > 0;
  }
  if (extraction.intent === "balance" || extraction.intent === "add_customer") return extraction.name.trim().length >= 2;
  if (extraction.intent === "rent" || extraction.intent === "bill") return (positiveAmount(extraction.amount) ?? 0) > 0;
  if (extraction.intent === "rent_received") return (positiveAmount(extraction.amount) ?? 0) > 0;
  if (extraction.intent === "start_rental") return extraction.name.trim().length >= 2 || (extraction.assetQuery?.trim().length ?? 0) >= 2;
  if (extraction.intent === "return_rental") return (extraction.assetQuery?.trim().length ?? 0) >= 2 || extraction.name.trim().length >= 2;
  return false;
}

function positiveAmount(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const amount = Math.round(value);
  if (amount <= 0 || amount > 100_000_000) return null;
  return amount;
}

function isoDate(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : "";
}

function defaultLabel(intent: LedgerIntent, billKind: LlmExtraction["billKind"]): string {
  if (intent === "rent") return "Kiraya";
  if (intent === "rent_received") return "Kiraya Mila";
  if (intent === "start_rental") return "Kiraya Par Diya";
  if (intent === "return_rental") return "Kiraya Wapsi";
  if (intent === "bill") {
    if (billKind === "bijli") return "Bijli";
    if (billKind === "paani") return "Paani";
    return "Bill";
  }
  return "";
}

function fromInterpret(result: Extract<InterpretResult, { ok: true }>): PreparedTurn {
  if (result.intent === "rent_overdue_query") {
    return {
      ok: true,
      source: "parser",
      mode: "reply",
      reply: "Kiraya baaki dekhne ke liye 'Rentals' tab check karein.",
    };
  }
  if (result.intent === "rent_received") {
    return action("parser", "rent_received", {
      name: result.customerQuery,
      phone: result.phone ?? "",
      amount: result.amount,
      note: result.note ?? "",
      date: result.spokenDate ?? "",
      assetQuery: result.assetQuery,
      status: "paid",
    });
  }
  if (result.intent === "start_rental") {
    return action("parser", "start_rental", {
      name: result.customerQuery,
      phone: result.phone ?? "",
      amount: result.rate,
      note: result.note ?? "",
      assetQuery: result.assetQuery,
      days: result.days,
      rate: result.rate,
      ratePeriod: result.ratePeriod,
    });
  }
  if (result.intent === "return_rental") {
    return action("parser", "return_rental", {
      name: result.customerQuery ?? "",
      phone: result.phone ?? "",
      assetQuery: result.assetQuery,
    });
  }
  if (result.intent === "add_customer") {
    return action("parser", "add_customer", { name: result.name, phone: result.phone ?? "" });
  }
  if (result.intent === "rent" || result.intent === "bill") {
    return action("parser", result.intent, {
      amount: result.amount,
      note: result.note ?? "",
      date: result.spokenDate ?? "",
      status: result.status,
      billKind: result.billKind,
      label: result.label,
    });
  }
  return action("parser", result.intent, {
    name: result.customerQuery,
    phone: "phone" in result ? (result.phone ?? "") : "",
    amount: "amount" in result ? result.amount : null,
    note: "note" in result ? (result.note ?? "") : "",
    date: result.spokenDate ?? "",
  });
}

function action(source: TurnSource, intent: LedgerIntent, fields: Partial<PreparedTurn & { ok: true; mode: "action" }>): PreparedTurn {
  return {
    ok: true,
    source,
    mode: "action",
    intent,
    name: fields.name ?? "",
    phone: fields.phone ?? "",
    amount: fields.amount ?? null,
    note: fields.note ?? "",
    date: fields.date ?? "",
    status: fields.status ?? "due",
    billKind: fields.billKind ?? "other",
    label: fields.label ?? defaultLabel(intent, fields.billKind ?? ""),
    party: fields.party ?? "",
    period: fields.period ?? "",
    assetQuery: fields.assetQuery,
    days: fields.days,
    rate: fields.rate,
    ratePeriod: fields.ratePeriod,
  };
}
