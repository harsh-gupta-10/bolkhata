/** Fictional demo rows only. Phones are 90000 xxxxx. */
export const SAMPLE_PEOPLE = [
  { name: "Ramesh Kumar", phone: "9000011111" },
  { name: "Sita Devi", phone: "9000022222" },
  { name: "Imran Sheikh", phone: "9000033333" },
  { name: "Rajesh Sharma", phone: "9000044444" },
  { name: "Sunita Verma", phone: "9000055555" },
  { name: "Vikram Singh", phone: "9000066666" },
  { name: "Anita Gupta", phone: "9000077777" },
  { name: "Manoj Dairywala", phone: "9000088888" },
] as const;

export const SAMPLE_LINES = [
  // Ramesh Kumar (90000 11111)
  { name: "Ramesh Kumar", type: "udhaar" as const, amount: 250, note: "atta 5 kilo", createdAt: "2026-11-02T09:15:00+05:30", dueDate: "2026-11-15" },
  { name: "Ramesh Kumar", type: "payment" as const, amount: 100, note: "cash jama", createdAt: "2026-11-03T18:40:00+05:30", dueDate: null },
  { name: "Ramesh Kumar", type: "udhaar" as const, amount: 340, note: "refined tel 1L, namak 2 packet", createdAt: "2026-11-05T11:20:00+05:30", dueDate: "2026-11-20" },

  // Sita Devi (90000 22222)
  { name: "Sita Devi", type: "udhaar" as const, amount: 480, note: "chawal 2 kilo", createdAt: "2026-11-01T10:05:00+05:30", dueDate: "2026-11-10" },
  { name: "Sita Devi", type: "payment" as const, amount: 480, note: "UPI se pura jama", createdAt: "2026-11-04T16:30:00+05:30", dueDate: null },
  { name: "Sita Devi", type: "udhaar" as const, amount: 320, note: "desi ghee 500g, cheeni 1kg", createdAt: "2026-11-07T08:15:00+05:30", dueDate: "2026-11-18" },

  // Imran Sheikh (90000 33333)
  { name: "Imran Sheikh", type: "udhaar" as const, amount: 150, note: "tel 1 litre", createdAt: "2026-11-03T08:30:00+05:30", dueDate: "2026-11-12" },
  { name: "Imran Sheikh", type: "udhaar" as const, amount: 220, note: "dudh 2 packet, parle-g biscuit", createdAt: "2026-11-06T19:00:00+05:30", dueDate: "2026-11-16" },

  // Rajesh Sharma (90000 44444)
  { name: "Rajesh Sharma", type: "udhaar" as const, amount: 1200, note: "arhar dal 5kg, sarson tel 5L tin", createdAt: "2026-11-02T14:10:00+05:30", dueDate: "2026-11-15" },

  // Sunita Verma (90000 55555) — Overdue udhaar demonstration
  { name: "Sunita Verma", type: "udhaar" as const, amount: 2400, note: "mahine ka ration: aashirvaad atta, basmati chawal", createdAt: "2026-10-25T17:45:00+05:30", dueDate: "2026-11-05" },
  { name: "Sunita Verma", type: "udhaar" as const, amount: 1000, note: "masale aur dry fruits", createdAt: "2026-11-02T12:00:00+05:30", dueDate: "2026-11-12" },

  // Vikram Singh (90000 66666)
  { name: "Vikram Singh", type: "udhaar" as const, amount: 560, note: "cold drinks 2 crate", createdAt: "2026-11-04T15:20:00+05:30", dueDate: "2026-11-14" },
  { name: "Vikram Singh", type: "payment" as const, amount: 500, note: "grahak ne diya", createdAt: "2026-11-06T17:10:00+05:30", dueDate: null },

  // Anita Gupta (90000 77777)
  { name: "Anita Gupta", type: "udhaar" as const, amount: 850, note: "surf excel 1kg, dettol soap, shampoo", createdAt: "2026-11-05T10:40:00+05:30", dueDate: "2026-11-20" },
  { name: "Anita Gupta", type: "payment" as const, amount: 500, note: "partial payment", createdAt: "2026-11-07T12:30:00+05:30", dueDate: null },

  // Manoj Dairywala (90000 88888)
  { name: "Manoj Dairywala", type: "udhaar" as const, amount: 450, note: "chai patti 1kg, shakkar 5kg", createdAt: "2026-11-04T07:30:00+05:30", dueDate: "2026-11-08" },
  { name: "Manoj Dairywala", type: "payment" as const, amount: 450, note: "hisab barabar", createdAt: "2026-11-08T08:00:00+05:30", dueDate: null },
];

export const SAMPLE_RECORDS = [
  { kind: "rent" as const, party: "Sample landlord", amount: 15000, label: "Kiraya", status: "paid" as const, period: "November 2026", note: "Dukaan ka mahina kiraya", isRecurring: 1, recurringDay: 1 },
  { kind: "bill" as const, party: "Sample discom", amount: 1450, label: "Bijli Bill", billKind: "bijli", status: "due" as const, period: "November 2026", note: "Meter reading bill" },
  { kind: "bill" as const, party: "Jal Board", amount: 450, label: "Paani Bill", billKind: "paani", status: "paid" as const, period: "November 2026", note: "Commercial water connection" },
  { kind: "bill" as const, party: "Airtel Broadband", amount: 800, label: "WiFi Internet", billKind: "vendor", status: "paid" as const, period: "November 2026", note: "POS aur CCTV internet" },
  { kind: "bill" as const, party: "Nagar Nigam", amount: 1200, label: "Trade Tax", billKind: "vendor", status: "due" as const, period: "Quarter 3", note: "Dukaan trade license shulk" },
];

export const SAMPLE_RENTAL_ASSETS = [
  {
    name: "Kamra 1 (First Floor Room)",
    type: "property" as const,
    description: "Dukaan ke upar ka residential kamra",
    rate: 5000,
    ratePeriod: "per_month" as const,
    securityDeposit: 10000,
    notes: "Attached bathroom aur balcony",
  },
  {
    name: "Godown 2 (Storage Unit)",
    type: "property" as const,
    description: "500 sqft shutter godown with 24/7 power backup",
    rate: 12000,
    ratePeriod: "per_month" as const,
    securityDeposit: 25000,
    notes: "Heavy storage suitable for grain/rice bags",
  },
  {
    name: "Shop Front Stall Space",
    type: "property" as const,
    description: "Dukaan ke bahar juice/paan stall space",
    rate: 3000,
    ratePeriod: "per_month" as const,
    securityDeposit: 5000,
    notes: "Street facing prime stall spot",
  },
  {
    name: "Commercial Atta Chakki",
    type: "equipment" as const,
    description: "Heavy-duty electric flour mill with motor",
    rate: 200,
    ratePeriod: "per_day" as const,
    securityDeposit: 500,
    notes: "Daily/weekly rental machine",
  },
  {
    name: "Commercial Deep Freezer (300L)",
    type: "equipment" as const,
    description: "Commercial ice cream & cold drinks deep freezer",
    rate: 800,
    ratePeriod: "per_week" as const,
    securityDeposit: 2000,
    notes: "Inverter technology, 5-star rating",
  },
  {
    name: "Tent & 50 Chairs Set",
    type: "equipment" as const,
    description: "Waterproof marquee tent with 50 plastic chairs",
    rate: 1200,
    ratePeriod: "per_day" as const,
    securityDeposit: 1000,
    notes: "Event and wedding function rental",
  },
  {
    name: "Silent Diesel Generator 5kVA",
    type: "equipment" as const,
    description: "Soundproof portable diesel power generator",
    rate: 1500,
    ratePeriod: "per_day" as const,
    securityDeposit: 3000,
    notes: "Emergency backup rental",
  },
] as const;

export const SAMPLE_RENTAL_AGREEMENTS = [
  {
    assetName: "Kamra 1 (First Floor Room)",
    customerName: "Sita Devi",
    startDate: "2026-10-01",
    rate: 5000,
    ratePeriod: "per_month" as const,
    depositTaken: 10000,
    dueDay: 5,
    notes: "Monthly tenant Sita Devi",
  },
  {
    assetName: "Godown 2 (Storage Unit)",
    customerName: "Rajesh Sharma",
    startDate: "2026-09-01",
    rate: 12000,
    ratePeriod: "per_month" as const,
    depositTaken: 25000,
    dueDay: 1,
    notes: "Grain merchant storage lease",
  },
  {
    assetName: "Commercial Atta Chakki",
    customerName: "Ramesh Kumar",
    startDate: "2026-11-05",
    endDate: "2026-11-08",
    rate: 200,
    ratePeriod: "per_day" as const,
    depositTaken: 500,
    notes: "3-day chakki rental for family function",
  },
  {
    assetName: "Commercial Deep Freezer (300L)",
    customerName: "Vikram Singh",
    startDate: "2026-10-15",
    rate: 800,
    ratePeriod: "per_week" as const,
    depositTaken: 2000,
    notes: "Festival cold storage rental",
  },
] as const;

export const SAMPLE_SUPPLIER_PURCHASES = [
  {
    supplierName: "Gupta Wholesale Mandi",
    supplierPhone: "9000044444",
    itemsText: "Chawal 50kg bag, Mustard Oil 15L tin",
    amount: 5200,
    status: "pending" as const,
    note: "Diwali wholesale order",
  },
  {
    supplierName: "Kisan Flour Mills",
    supplierPhone: "9000055555",
    itemsText: "Atta 100kg (2x50kg bags)",
    amount: 3200,
    status: "paid" as const,
    note: "Cash paid on delivery",
  },
  {
    supplierName: "Madhur Sugar Depot",
    supplierPhone: "9000077777",
    itemsText: "Sugar M-30 Grade 50kg bag",
    amount: 2100,
    status: "paid" as const,
    note: "Mandi wholesale rate ₹42/kg",
  },
  {
    supplierName: "Amul Dairy Distributor",
    supplierPhone: "9000088888",
    itemsText: "Butter 100g x 50, Paneer 200g x 30",
    amount: 4500,
    status: "paid" as const,
    note: "Weekly dairy delivery via UPI",
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
