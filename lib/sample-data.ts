/** Fictional demo rows only. Phones are 90000 xxxxx. */
export const SAMPLE_PEOPLE = [
  { name: "Ramesh Kumar", phone: "9000011111" },
  { name: "Sita Devi", phone: "9000022222" },
  { name: "Imran Sheikh", phone: "9000033333" },
] as const;

export const SAMPLE_LINES = [
  { name: "Ramesh Kumar", type: "udhaar" as const, amount: 250, note: "atta 5 kilo", createdAt: "2026-11-02T09:15:00+05:30" },
  { name: "Ramesh Kumar", type: "payment" as const, amount: 100, note: "", createdAt: "2026-11-03T18:40:00+05:30" },
  { name: "Sita Devi", type: "udhaar" as const, amount: 480, note: "chawal 2 kilo", createdAt: "2026-11-01T10:05:00+05:30" },
  { name: "Imran Sheikh", type: "udhaar" as const, amount: 150, note: "tel 1 litre", createdAt: "2026-11-03T08:30:00+05:30" },
];

export const SAMPLE_RECORDS = [
  { kind: "rent" as const, party: "Sample landlord", amount: 15000, label: "Kiraya", status: "due" as const, period: "November 2026", note: "Sample data" },
  { kind: "bill" as const, party: "Sample discom", amount: 1450, label: "Bijli", billKind: "bijli", status: "due" as const, period: "November 2026", note: "Sample data" },
];

export const SAMPLE_RENTAL_ASSETS = [
  {
    name: "Kamra 1",
    type: "property" as const,
    description: "Dukaan ke upar ka kamra",
    rate: 5000,
    ratePeriod: "per_month" as const,
    securityDeposit: 10000,
    notes: "Attached bathroom aur balcony",
  },
  {
    name: "Atta chakki",
    type: "equipment" as const,
    description: "Commercial flour mill",
    rate: 200,
    ratePeriod: "per_day" as const,
    securityDeposit: 500,
    notes: "Rental machine",
  },
] as const;

export const SAMPLE_RENTAL_AGREEMENTS = [
  {
    assetName: "Kamra 1",
    customerName: "Sita Devi",
    startDate: "2026-10-01",
    rate: 5000,
    ratePeriod: "per_month" as const,
    depositTaken: 10000,
    dueDay: 5,
    notes: "Monthly tenant Sita Devi",
  },
  {
    assetName: "Atta chakki",
    customerName: "Ramesh Kumar",
    startDate: "2026-11-05",
    endDate: "2026-11-08",
    rate: 200,
    ratePeriod: "per_day" as const,
    depositTaken: 500,
    notes: "3-day chakki rental",
  },
] as const;

export const SAMPLE_SUPPLIER_PURCHASES = [
  {
    supplierName: "Gupta Wholesale",
    supplierPhone: "9000044444",
    itemsText: "Chawal 50kg, Mustard Oil 15L",
    amount: 5200,
    status: "pending" as const,
    note: "Diwali wholesale order",
  },
  {
    supplierName: "Kisan Flour Mills",
    supplierPhone: "9000055555",
    itemsText: "Atta 100kg",
    amount: 3200,
    status: "paid" as const,
    note: "Cash paid on delivery",
  },
] as const;

export function sampleLineKey(input: { name: string; type: string; amount: number; note?: string | null }): string {
  return `${input.name.trim().toLowerCase()}|${input.type}|${Number(input.amount)}|${(input.note ?? "").trim().toLowerCase()}`;
}

export function sampleRecordKey(input: { kind: string; party?: string | null; amount: number }): string {
  return `${input.kind}|${(input.party ?? "").trim().toLowerCase()}|${Number(input.amount)}`;
}

export function sampleAssetKey(name: string): string {
  return name.trim().toLowerCase();
}

export function sampleStatus(input: {
  customers: { name: string; phone?: string | null }[];
  entries: { customerName?: string; customerPhone?: string | null; type: string; amount: number; note?: string | null }[];
  records: { kind: string; party?: string | null; amount: number }[];
  assets?: { name: string }[];
}): { complete: boolean; missingPeople: string[]; missingLines: string[]; missingRecords: string[]; missingAssets?: string[] } {
  const phones = new Set(input.customers.map((customer) => (customer.phone ?? "").replace(/\D/g, "")).filter(Boolean));
  const phoneByName = new Map(SAMPLE_PEOPLE.map((person) => [person.name.toLowerCase(), person.phone]));
  const lines = new Set(
    input.entries
      .filter((entry) => {
        const phone = (entry.customerPhone ?? "").replace(/\D/g, "");
        const expected = phoneByName.get((entry.customerName ?? "").trim().toLowerCase());
        return phone ? phone === expected : false;
      })
      .map((entry) => sampleLineKey({ name: entry.customerName ?? "", type: entry.type, amount: entry.amount, note: entry.note })),
  );
  const records = new Set(input.records.map((record) => sampleRecordKey(record)));
  const missingPeople = SAMPLE_PEOPLE.filter((person) => !phones.has(person.phone)).map((person) => person.name);
  const missingLines = SAMPLE_LINES.filter((line) => !lines.has(sampleLineKey(line))).map((line) => sampleLineKey(line));
  const missingRecords = SAMPLE_RECORDS.filter((record) => !records.has(sampleRecordKey(record))).map((record) => sampleRecordKey(record));

  let missingAssets: string[] = [];
  if (input.assets) {
    const existingAssets = new Set(input.assets.map((a) => sampleAssetKey(a.name)));
    missingAssets = SAMPLE_RENTAL_ASSETS.filter((a) => !existingAssets.has(sampleAssetKey(a.name))).map((a) => a.name);
  }

  const complete = missingPeople.length + missingLines.length + missingRecords.length === 0;
  return { complete, missingPeople, missingLines, missingRecords, missingAssets };
}
