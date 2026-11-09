import { matchCustomers, type MatchResult, type NamedPerson } from "@/lib/match";
import { formatRupees } from "@/lib/format";

export interface ShopPerson extends NamedPerson {
  phone: string | null;
  balance: number;
}

export type PresentedMatch =
  | { kind: "one"; person: ShopPerson; summary: string }
  | { kind: "many"; people: ShopPerson[]; summary: string }
  | { kind: "none"; summary: string };

export function presentPeople(query: string, people: ShopPerson[]): PresentedMatch {
  const match = matchCustomers(query, people);
  if (match.status === "one") {
    const person = hydrate(match.customer.id, people);
    return person
      ? { kind: "one", person, summary: personLine(person) }
      : { kind: "none", summary: "Koi match nahi mila." };
  }
  if (match.status === "many") {
    const list = match.customers.map((customer) => hydrate(customer.id, people)).filter((person): person is ShopPerson => Boolean(person));
    return { kind: "many", people: list, summary: "Kaunsa wala?" };
  }
  return { kind: "none", summary: "Koi aisa naam nahi mila. Naya grahak bana sakte ho." };
}

export function projectBalance(current: number, intent: "udhaar" | "payment", amount: number): number {
  return intent === "udhaar" ? current + amount : current - amount;
}

export function actionSummary(input: {
  intent: "udhaar" | "payment" | "balance" | "rent" | "bill" | "add_customer";
  name: string;
  phone?: string | null;
  amount?: number;
  note?: string;
  balanceAfter?: number | null;
  status?: "due" | "paid";
}): string {
  const who = `${input.name} (${input.phone?.trim() || "phone nahi diya"})`;
  if (input.intent === "add_customer") return `${who} ka naya khata kholen?`;
  if (input.intent === "balance") return `${who} ka baaki ${formatRupees(input.balanceAfter ?? 0)} hai. Kuch likha nahi jayega.`;
  if (input.intent === "udhaar" || input.intent === "payment") {
    const verb = input.intent === "udhaar" ? "udhaar" : "jama";
    const note = input.note ? ` Note: ${input.note}.` : "";
    const after = input.balanceAfter == null ? "" : ` Naya baaki ${formatRupees(input.balanceAfter)}.`;
    return `${who} ke khate mein ${formatRupees(input.amount ?? 0)} ${verb} likhen?${note}${after}`;
  }
  const label = input.intent === "rent" ? "kiraya" : "bill";
  const state = input.status === "paid" ? "jama" : "due";
  return `${label} ${formatRupees(input.amount ?? 0)} ${state} likhen?${input.note ? ` Note: ${input.note}.` : ""}`;
}

function personLine(person: ShopPerson): string {
  return `${person.name} (${person.phone?.trim() || "phone nahi diya"})`;
}

function hydrate(id: string, people: ShopPerson[]): ShopPerson | undefined {
  return people.find((person) => person.id === id);
}

/** Last 10 digits, or null when the shopkeeper has not given a real phone. */
export function phoneDigits(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

export function peopleWriteReady(input: {
  intent: "add_customer" | "udhaar" | "payment";
  name: string;
  phone?: string | null;
  amount?: number | null;
  ambiguous: boolean;
  personChosen: boolean;
}): { ok: boolean; reason: string } {
  if (input.ambiguous && !input.personChosen) {
    return { ok: false, reason: "Kaunsa wala? Naam aur phone chuno." };
  }
  if (input.name.trim().length < 2) return { ok: false, reason: "Naam likho." };
  if (!phoneDigits(input.phone)) return { ok: false, reason: "Phone zaroori hai. 10 digit likho." };
  if (input.intent !== "add_customer" && !(input.amount && input.amount > 0)) {
    return { ok: false, reason: "Amount likho." };
  }
  return { ok: true, reason: "" };
}

export function matchedIds(match: MatchResult): string[] {
  if (match.status === "one") return [match.customer.id];
  if (match.status === "many") return match.customers.map((customer) => customer.id);
  return [];
}
