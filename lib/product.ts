export const CONTACT_GRACE_MS = 10 * 60 * 1000;

export function shouldSendOnKey(input: { key: string; shiftKey: boolean; composing: boolean }): boolean {
  return input.key === "Enter" && !input.shiftKey && !input.composing;
}

export function keepCustomer(input: {
  hasEntries: boolean;
  balance: number;
  matchesRecord: boolean;
  insertedAt: string | null;
  now: number;
  graceMs?: number;
}): boolean {
  if (input.hasEntries || input.balance !== 0 || input.matchesRecord) return true;
  const grace = input.graceMs ?? CONTACT_GRACE_MS;
  if (!input.insertedAt) return false;
  const age = input.now - new Date(input.insertedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < grace;
}

export function pickMainContacts<T extends { id: string; balance: number }>(customers: T[], preferredIds: string[], limit = 12): T[] {
  const rank = new Map(preferredIds.map((id, index) => [id, index]));
  return [...customers]
    .filter((customer) => customer.balance !== 0 || rank.has(customer.id))
    .sort((a, b) => {
      const left = rank.get(a.id) ?? 1000;
      const right = rank.get(b.id) ?? 1000;
      if (left !== right) return left - right;
      return Math.abs(b.balance) - Math.abs(a.balance);
    })
    .slice(0, limit);
}

export interface MemoryFact {
  name: string;
  phone: string | null;
  balance: number;
  lastAmount: number | null;
  lastNote: string | null;
  lastIntent: string | null;
}

export function compactMemory(facts: MemoryFact[], limit = 12): string {
  return facts
    .slice(0, limit)
    .map((fact) =>
      [fact.name, fact.phone ?? "", String(fact.balance), fact.lastIntent ?? "", fact.lastAmount ?? "", fact.lastNote ?? ""].join(" | "),
    )
    .join("\n");
}
