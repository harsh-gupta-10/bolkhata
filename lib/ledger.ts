import type { Customer, Entry, EntryType, Ledger, ShopRecord } from "@/lib/types";
import { emptyLedger } from "@/lib/types";

export function outstandingTotal(ledger: Ledger): number {
  return ledger.customers.reduce((sum, customer) => sum + Math.max(0, customer.balance), 0);
}

export function collectedTotal(ledger: Ledger): number {
  return ledger.customers.reduce(
    (sum, customer) => sum + customer.entries.filter((entry) => entry.type === "payment").reduce((inner, entry) => inner + entry.amount, 0),
    0,
  );
}

export function shopTotal(ledger: Ledger, kind: ShopRecord["kind"], status: ShopRecord["status"]): number {
  return (ledger.shop ?? []).filter((record) => record.kind === kind && record.status === status).reduce((sum, record) => sum + record.amount, 0);
}

export function appendShop(ledger: Ledger, record: ShopRecord): Ledger {
  return { ...ledger, shop: [...(ledger.shop ?? []), record] };
}

export function createCustomer(input: {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
}): Customer {
  return {
    id: input.id,
    name: input.name.trim(),
    phone: input.phone,
    createdAt: input.createdAt,
    entries: [],
    balance: 0,
  };
}

export function appendEntry(
  customer: Customer,
  input: {
    id: string;
    createdAt: string;
    type: EntryType;
    amount: number;
    note?: string;
    transcript?: string;
  },
): Customer {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be a positive whole number of rupees.");
  }
  const delta = input.type === "udhaar" ? input.amount : -input.amount;
  const balance = customer.balance + delta;
  const entry: Entry = {
    id: input.id,
    createdAt: input.createdAt,
    type: input.type,
    amount: input.amount,
    note: input.note,
    runningBalance: balance,
    transcript: input.transcript,
  };
  return {
    ...customer,
    balance,
    entries: [...customer.entries, entry],
  };
}

export function insertCustomer(ledger: Ledger, customer: Customer): Ledger {
  return { ...ledger, customers: [customer, ...ledger.customers] };
}

export function replaceCustomer(ledger: Ledger, customer: Customer): Ledger {
  return {
    ...ledger,
    customers: ledger.customers.map((item) => (item.id === customer.id ? customer : item)),
  };
}

export function cloneLedger(ledger: Ledger): Ledger {
  return structuredClone(ledger);
}

export { emptyLedger };
