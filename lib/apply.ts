import { matchCustomers, type MatchResult } from "@/lib/match";
import { appendEntry, appendShop, createCustomer, insertCustomer, replaceCustomer } from "@/lib/ledger";
import type { InterpretResult } from "@/lib/parser";
import { addCustomerSpeech, balanceSpeech, billSpeech, paymentSpeech, rentSpeech, udhaarSpeech } from "@/lib/speech";
import type { Customer, Ledger } from "@/lib/types";
import { formatRupees } from "@/lib/format";

export interface ApplyMeta {
  transcript?: string;
  at: string;
  nextId: () => string;
}

export interface ApplySuccess {
  ok: true;
  ledger: Ledger;
  wrote: boolean;
  speech: string;
  title: string;
  chips: string[];
  detail: string;
  customerId?: string;
  tone: "add" | "udhaar" | "payment" | "balance" | "rent" | "bill";
}

export interface ApplyFailure {
  ok: false;
  speech: string;
  message: string;
}

export function applyInterpret(
  ledger: Ledger,
  result: InterpretResult,
  meta: ApplyMeta,
  chosenCustomerId?: string,
): ApplySuccess | ApplyFailure {
  if (!result.ok) {
    return { ok: false, speech: "Samajh nahi aaya. Dobara boliye.", message: "Samajh nahi aaya. Dobara boliye ya likh dijiye." };
  }

  if (result.intent === "add_customer") {
    const existing = matchCustomers(result.name, ledger.customers);
    if (existing.status === "one") {
      return {
        ok: false,
        speech: `${existing.customer.name} ka khata pehle se hai.`,
        message: `${existing.customer.name} ka khata pehle se hai.`,
      };
    }
    const customer = createCustomer({
      id: meta.nextId(),
      name: result.name,
      phone: result.phone,
      createdAt: meta.at,
    });
    return {
      ok: true,
      ledger: insertCustomer(ledger, customer),
      wrote: true,
      speech: addCustomerSpeech(customer.name),
      title: "Naya khata",
      chips: [customer.name, result.phone ? formatPhoneChip(result.phone) : "bina phone"].filter(Boolean),
      detail: addCustomerSpeech(customer.name),
      customerId: customer.id,
      tone: "add",
    };
  }

  if (result.intent === "rent" || result.intent === "bill") {
    const record = {
      id: meta.nextId(),
      createdAt: meta.at,
      kind: result.intent,
      status: result.status,
      amount: result.amount,
      label: result.label,
      billKind: result.intent === "bill" ? result.billKind : undefined,
      note: result.note,
      transcript: meta.transcript,
    };
    const speech =
      result.intent === "rent"
        ? rentSpeech(result.amount, result.status)
        : billSpeech(result.label, result.amount, result.status);
    return {
      ok: true,
      ledger: appendShop(ledger, record),
      wrote: true,
      speech,
      title: result.intent === "rent" ? (result.status === "paid" ? "Kiraya jama" : "Kiraya baaki") : result.status === "paid" ? "Bill jama" : "Bill likha",
      chips: [record.label, result.status === "paid" ? "Jama" : "Due", formatRupees(result.amount), result.note ?? ""].filter(Boolean),
      detail: speech,
      tone: result.intent,
    };
  }

  if (result.intent === "rent_overdue_query") {
    return {
      ok: true,
      ledger,
      wrote: false,
      speech: "Kiraya baaki report screen par dekhiye.",
      title: "Kiraya Baaki",
      chips: ["Kiraya Baaki"],
      detail: "Kiraya baaki report",
      tone: "rent",
    };
  }

  if (result.intent === "start_rental" || result.intent === "return_rental" || result.intent === "rent_received") {
    return {
      ok: true,
      ledger,
      wrote: false,
      speech: "Rental draft screen par dekhiye.",
      title: "Kiraya Mila",
      chips: ["Kiraya Mila"],
      detail: "Rental draft",
      tone: "rent",
    };
  }

  const customer = resolveCustomer(ledger, result.match, chosenCustomerId);
  if (!customer) {
    if (result.match.status === "many" && !chosenCustomerId) {
      return { ok: false, speech: "Kaunsa wala? Screen par chuniye.", message: "Kaunsa wala? Neeche chuniye." };
    }
    return {
      ok: false,
      speech: "Yeh naam khate mein nahi mila.",
      message: `${result.customerQuery} khate mein nahi hai. Naya grahak bolo, ya naam theek karo.`,
    };
  }

  if (result.intent === "balance") {
    const speech = balanceSpeech(customer.name, customer.balance);
    return {
      ok: true,
      ledger,
      wrote: false,
      speech,
      title: "Baaki",
      chips: [customer.name, formatRupees(customer.balance)],
      detail: speech,
      customerId: customer.id,
      tone: "balance",
    };
  }

  const updated = appendEntry(customer, {
    id: meta.nextId(),
    createdAt: meta.at,
    type: result.intent,
    amount: result.amount,
    note: result.note,
    transcript: meta.transcript,
  });
  const speech =
    result.intent === "udhaar"
      ? udhaarSpeech(updated.name, result.amount, updated.balance)
      : paymentSpeech(updated.name, result.amount, updated.balance);
  const chips = [updated.name, result.intent === "udhaar" ? "Udhaar" : "Jama", formatRupees(result.amount)];
  if (result.note) chips.push(result.note);
  chips.push(`Baaki ${formatRupees(updated.balance)}`);
  return {
    ok: true,
    ledger: replaceCustomer(ledger, updated),
    wrote: true,
    speech,
    title: result.intent === "udhaar" ? "Udhaar likh diya" : "Jama ho gaya",
    chips,
    detail: speech,
    customerId: updated.id,
    tone: result.intent,
  };
}

function resolveCustomer(
  ledger: Ledger,
  match: MatchResult,
  chosenCustomerId?: string,
): Customer | undefined {
  if (chosenCustomerId) return ledger.customers.find((customer) => customer.id === chosenCustomerId);
  if (match.status === "one") return ledger.customers.find((customer) => customer.id === match.customer.id);
  return undefined;
}

function formatPhoneChip(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}
