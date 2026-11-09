import { appendEntry, createCustomer } from "@/lib/ledger";
import type { Customer, EntryType, Ledger } from "@/lib/types";

interface SeedEntry {
  id: string;
  createdAt: string;
  type: EntryType;
  amount: number;
  note?: string;
}

function seedCustomer(
  id: string,
  name: string,
  phone: string,
  createdAt: string,
  entries: SeedEntry[],
): Customer {
  let customer = createCustomer({ id, name, phone, createdAt });
  for (const entry of entries) customer = appendEntry(customer, entry);
  return customer;
}

/** Obviously fictional shop. Phones are 90000 xxxxx — not real numbers. */
export function demoLedger(): Ledger {
  return {
    version: 2,
    shop: [
      {
        id: "demo-rent-due",
        createdAt: "2026-11-01T09:00:00+05:30",
        kind: "rent",
        status: "due",
        amount: 15000,
        label: "Kiraya",
        note: "November dukaan",
      },
      {
        id: "demo-rent-paid",
        createdAt: "2026-11-02T11:00:00+05:30",
        kind: "rent",
        status: "paid",
        amount: 15000,
        label: "Kiraya",
        note: "November jama",
      },
      {
        id: "demo-bijli",
        createdAt: "2026-11-04T18:00:00+05:30",
        kind: "bill",
        status: "due",
        amount: 1450,
        label: "Bijli",
        billKind: "bijli",
        note: "November",
      },
      {
        id: "demo-paani",
        createdAt: "2026-11-05T10:00:00+05:30",
        kind: "bill",
        status: "paid",
        amount: 320,
        label: "Paani",
        billKind: "paani",
      },
    ],
    messages: [],
    customers: [
      seedCustomer("demo-ramesh", "Ramesh Kumar", "9000011111", "2026-11-02T09:10:00+05:30", [
        {
          id: "demo-ramesh-1",
          createdAt: "2026-11-02T09:15:00+05:30",
          type: "udhaar",
          amount: 250,
          note: "atta 5 kilo",
        },
        {
          id: "demo-ramesh-2",
          createdAt: "2026-11-03T18:40:00+05:30",
          type: "payment",
          amount: 100,
        },
        {
          id: "demo-ramesh-3",
          createdAt: "2026-11-05T11:05:00+05:30",
          type: "udhaar",
          amount: 80,
          note: "cheeni 1 kilo",
        },
      ]),
      seedCustomer("demo-sita", "Sita Devi", "9000022222", "2026-11-01T10:00:00+05:30", [
        {
          id: "demo-sita-1",
          createdAt: "2026-11-01T10:05:00+05:30",
          type: "udhaar",
          amount: 480,
          note: "chawal 2 kilo",
        },
        {
          id: "demo-sita-2",
          createdAt: "2026-11-04T16:20:00+05:30",
          type: "payment",
          amount: 200,
        },
      ]),
      seedCustomer("demo-imran", "Imran Sheikh", "9000033333", "2026-11-03T08:20:00+05:30", [
        {
          id: "demo-imran-1",
          createdAt: "2026-11-03T08:30:00+05:30",
          type: "udhaar",
          amount: 150,
          note: "tel 1 litre",
        },
        {
          id: "demo-imran-2",
          createdAt: "2026-11-06T09:00:00+05:30",
          type: "udhaar",
          amount: 60,
          note: "namak",
        },
      ]),
    ],
  };
}

export function mergeDemo(ledger: Ledger): Ledger {
  const demo = demoLedger();
  const names = new Set(ledger.customers.map((customer) => customer.name.toLowerCase()));
  const additions = demo.customers.filter((customer) => !names.has(customer.name.toLowerCase()));
  const shopIds = new Set((ledger.shop ?? []).map((record) => record.id));
  const shop = [...(demo.shop ?? []).filter((record) => !shopIds.has(record.id)), ...(ledger.shop ?? [])];
  return { ...ledger, version: 2, shop, messages: ledger.messages ?? [], customers: [...additions, ...ledger.customers] };
}
