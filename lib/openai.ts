import { emptyExtraction, type LlmExtraction } from "@/lib/understand";

const MODEL = () => process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
const ENDPOINT = "https://api.openai.com/v1/chat/completions";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: { type: "string", enum: ["udhaar", "payment", "balance", "rent", "bill", "add_customer", "rent_received", "start_rental", "return_rental", "reply", "unknown"] },
    name: { type: "string" },
    phone: { type: "string" },
    amount: { type: ["integer", "null"] },
    note: { type: "string" },
    date: { type: "string" },
    status: { type: "string", enum: ["due", "paid", ""] },
    billKind: { type: "string", enum: ["bijli", "paani", "other", ""] },
    label: { type: "string" },
    party: { type: "string" },
    period: { type: "string" },
    reply: { type: "string" },
  },
  required: ["intent", "name", "phone", "amount", "note", "date", "status", "billKind", "label", "party", "period", "reply"],
} as const;

export interface ShopSnapshot {
  udhaarOutstanding: number;
  rentDue: number;
  billsDue: number;
  locale: "hinglish" | "en";
  customers: { name: string; phone: string | null; balance: number }[];
  memory: string;
  recent: string;
}

/** Returns null when the key is missing, the call fails, or it times out. Never writes. */
export async function extractWithOpenAI(text: string, shop: ShopSnapshot): Promise<LlmExtraction | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL(),
        temperature: 0,
        max_tokens: 350,
        response_format: { type: "json_schema", json_schema: { name: "bolkhata_turn", strict: true, schema: SCHEMA } },
        messages: [
          { role: "system", content: systemPrompt(shop) },
          { role: "user", content: text.slice(0, 500) },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    return coerceExtraction(JSON.parse(content) as unknown);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function coerceExtraction(value: unknown): LlmExtraction | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const intent = row.intent;
  const allowed = new Set(["udhaar", "payment", "balance", "rent", "bill", "add_customer", "rent_received", "start_rental", "return_rental", "reply", "unknown"]);
  if (typeof intent !== "string" || !allowed.has(intent)) return null;
  const amount = row.amount == null || row.amount === "" ? null : Number(row.amount);
  return emptyExtraction({
    intent: intent as LlmExtraction["intent"],
    name: stringField(row.name),
    phone: stringField(row.phone),
    amount: amount != null && Number.isFinite(amount) ? Math.round(amount) : null,
    note: stringField(row.note),
    date: stringField(row.date),
    status: row.status === "paid" || row.status === "due" ? row.status : "",
    billKind: row.billKind === "bijli" || row.billKind === "paani" || row.billKind === "other" ? row.billKind : "",
    label: stringField(row.label),
    party: stringField(row.party),
    period: stringField(row.period),
    reply: stringField(row.reply),
  });
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function systemPrompt(shop: ShopSnapshot): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const people = shop.customers
    .slice(0, 40)
    .map((customer) => `${customer.name} | ${customer.phone ?? ""} | ${customer.balance}`)
    .join("\n");
  return [
    "You read one Hinglish or Hindi line from an Indian kirana shopkeeper.",
    "Return only the JSON schema. Do not invent names, phones, or amounts. Leave a field empty when it was not said.",
    "udhaar = credit given. payment = jama / de diye / vasool. balance = how much someone owes. rent = shop kiraya (paid). bill = bijli, paani, or another shop bill. add_customer = a new person.",
    "rent_received = rent received from a tenant (kiraya mila). start_rental = renting out an asset/equipment (kiraye par diya). return_rental = equipment returned (wapas mila).",
    `reply = a question or chat that is not a new ledger line. Answer in one short ${shop.locale === "en" ? "English" : "Hinglish"} sentence using only the totals, memory, and recent chat. unknown = you cannot tell.`,
    "A balance question about a named customer is intent balance, not reply.",
    `Today in India: ${today}. Shop totals in rupees: udhaar outstanding ${shop.udhaarOutstanding}, kiraya due ${shop.rentDue}, bills due ${shop.billsDue}.`,
    people ? `Main contacts, name | phone | balance:\n${people}` : "No main contacts yet.",
    shop.memory ? `Memory, name | phone | balance | intent | amount | note:\n${shop.memory}` : "",
    shop.recent ? `Recent chat:\n${shop.recent}` : "",
  ].filter(Boolean).join("\n");
}
