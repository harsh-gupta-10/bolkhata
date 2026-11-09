import { findHindiAmount } from "@/lib/hindi";
import { matchCustomers, nameTokens, type MatchResult, type NamedPerson } from "@/lib/match";

export type InterpretResult =
  | { ok: false; raw: string }
  | {
      ok: true;
      intent: "add_customer";
      name: string;
      phone?: string;
      raw: string;
    }
  | {
      ok: true;
      intent: "udhaar" | "payment";
      customerQuery: string;
      amount: number;
      note?: string;
      phone?: string;
      match: MatchResult;
      spokenDate?: string;
      raw: string;
    }
  | {
      ok: true;
      intent: "balance";
      customerQuery: string;
      match: MatchResult;
      raw: string;
      spokenDate?: string;
    }
  | {
      ok: true;
      intent: "rent";
      amount: number;
      note?: string;
      status: "due" | "paid";
      billKind: "bijli" | "paani" | "other";
      label: string;
      spokenDate?: string;
      raw: string;
    }
  | {
      ok: true;
      intent: "bill";
      amount: number;
      note?: string;
      status: "due" | "paid";
      billKind: "bijli" | "paani" | "other";
      label: string;
      spokenDate?: string;
      raw: string;
    }
  | {
      ok: true;
      intent: "rent_received";
      customerQuery: string;
      amount: number;
      assetQuery?: string;
      note?: string;
      phone?: string;
      match: MatchResult;
      spokenDate?: string;
      raw: string;
    }
  | {
      ok: true;
      intent: "start_rental";
      assetQuery: string;
      customerQuery: string;
      days?: number;
      rate: number;
      ratePeriod: "per_day" | "per_week" | "per_month" | "one_time";
      note?: string;
      phone?: string;
      match: MatchResult;
      raw: string;
    }
  | {
      ok: true;
      intent: "return_rental";
      assetQuery: string;
      customerQuery?: string;
      phone?: string;
      match?: MatchResult;
      raw: string;
    }
  | {
      ok: true;
      intent: "rent_overdue_query";
      raw: string;
    };

const ADD_PHRASES = [
  "add customer",
  "add grahak",
  "naya grahak",
  "naye grahak",
  "naya customer",
  "naya khata kholo",
  "nayi khata kholo",
  "khata kholo",
  "grahak jodo",
  "customer jodo",
  "naya khata",
  "nayi khata",
  "नया ग्राहक",
  "नए ग्राहक",
  "नया खाता",
  "खाता खोलो",
  "ग्राहक जोड़ो",
];

const UDHAAR_PHRASES = ["udhaari", "udhaar", "udhar", "उधारी", "उधार"];

const PAYMENT_PHRASES = [
  "de diye hain",
  "de diye hai",
  "de diya hai",
  "jama kar diye",
  "jama kar diya",
  "wapas kar diye",
  "de diye",
  "de diya",
  "de di",
  "jama kiya",
  "jama kiye",
  "mil gaye",
  "mil gaya",
  "wapas diye",
  "payment",
  "paid",
  "vasooli",
  "wasooli",
  "vasool",
  "wasool",
  "jama",
  "जमा",
  "वसूली",
  "वसूल",
];

const BALANCE_PHRASES = [
  "khata dikhao",
  "ka khata",
  "खाता दिखाओ",
  "balance",
  "बैलेंस",
  "baaki",
  "baki",
  "baqi",
  "बाकी",
  "bakaya",
  "बकाया",
  "hisaab",
  "hisab",
  "हिसाब",
  "kitna hai",
  "kitna",
  "कितना",
  "kitne",
  "कितने",
];

const QUERY_PHRASES = ["kitna hai", "kitna", "kitne", "कितना", "कितने"];

const RENT_PHRASES = [
  "dukaan ka kiraya",
  "dukan ka kiraya",
  "shop rent",
  "kiraya",
  "kiraye",
  "किराया",
  "rent",
];

const BILL_PHRASES = [
  "bijli ka bill",
  "electricity bill",
  "light bill",
  "paani ka bill",
  "pani ka bill",
  "water bill",
  "bijli bill",
  "bijli",
  "बिजली",
  "paani",
  "pani",
  "पानी",
  "bill",
  "बिल",
];

const PARTICLES = new Set([
  "ka",
  "ke",
  "ki",
  "ko",
  "se",
  "ne",
  "mein",
  "me",
  "main",
  "par",
  "pe",
  "hai",
  "hain",
  "tha",
  "thi",
  "the",
  "ho",
  "toh",
  "to",
  "bhi",
  "ji",
  "bhai",
  "bhaiya",
  "please",
  "pls",
  "kripya",
  "zara",
  "aur",
  "and",
  "or",
  "batao",
  "bata",
  "dijiye",
  "bolo",
  "likh",
  "likho",
  "karo",
  "kar",
  "dena",
  "do",
  "de",
  "diya",
  "diye",
  "kitna",
  "kitne",
  "kya",
  "abhi",
  "ab",
  "naam",
  "nam",
  "name",
  "phone",
  "number",
  "no",
  "kaun",
  "kaunsa",
  "kaunsi",
  "dikhao",
  "dikha",
  "wala",
  "wali",
  "wale",
  "for",
  "of",
  "a",
  "an",
  "mera",
  "mere",
  "meri",
  "uska",
  "uske",
  "sir",
  "madam",
  "sahab",
  "sahib",
  "का",
  "के",
  "की",
  "को",
  "से",
  "ने",
  "में",
  "मे",
  "पर",
  "पे",
  "है",
  "हैं",
  "था",
  "थी",
  "जी",
  "भाई",
  "कृपया",
  "कितना",
  "कितने",
  "बताओ",
  "बता",
  "लिखो",
  "लिख",
  "करो",
  "दो",
  "दे",
  "दिया",
  "दिए",
  "नाम",
  "फोन",
  "कौन",
  "कौनसा",
  "दिखाओ",
  "अभी",
  "और",
  "भी",
  "वाला",
  "वाली",
]);

const QTY_WORDS = new Set(["ek", "do", "teen", "char", "chaar", "paanch", "panch"]);

const UNITS = new Set([
  "kilo",
  "kg",
  "kgs",
  "gram",
  "grams",
  "g",
  "litre",
  "liter",
  "ltr",
  "l",
  "packet",
  "packets",
  "pack",
  "piece",
  "pieces",
  "pcs",
  "pc",
  "darjan",
  "dozen",
  "bora",
  "katta",
  "bottle",
  "dabba",
  "tin",
]);

const INTENT_NOISE = new Set([
  "balance",
  "बैलेंस",
  "baaki",
  "baki",
  "baqi",
  "बाकी",
  "bakaya",
  "बकाया",
  "hisaab",
  "hisab",
  "हिसाब",
  "udhaar",
  "udhar",
  "udhaari",
  "उधार",
  "उधारी",
  "jama",
  "जमा",
  "payment",
  "paid",
  "vasool",
  "wasool",
  "vasooli",
  "wasooli",
  "वसूल",
  "वसूली",
  "khata",
  "खाता",
  "dikhao",
  "दिखाओ",
]);

const ADD_STOP = new Set([
  ...PARTICLES,
  ...INTENT_NOISE,
  "customer",
  "grahak",
  "ग्राहक",
  "naya",
  "nayi",
  "naye",
  "नया",
  "नए",
  "add",
  "ऐड",
]);

interface Span {
  start: number;
  end: number;
}

interface AmountHit extends Span {
  value: number;
}

export function interpret(input: string, customers: NamedPerson[] = []): InterpretResult {
  const raw = input.trim();
  if (!raw) return { ok: false, raw: input };
  const normalized = normalize(raw);
  if (!normalized) return { ok: false, raw };
  const ident = stripIdentity(normalized);
  const text = ident.text;

  const overdueQuery = parseOverdueRentQuery(text);
  if (overdueQuery) return overdueQuery;

  const returnRental = parseReturnRental(text, raw, customers);
  if (returnRental) return returnRental;

  const startRental = parseStartRental(text, raw, customers);
  if (startRental) return startRental;

  const rentReceived = parseRentReceived(text, raw, customers);
  if (rentReceived) return rentReceived;

  const addSpan = findAddSpan(text);
  const udhaarSpan = findPhrase(text, UDHAAR_PHRASES);
  const paymentSpan = findPhrase(text, PAYMENT_PHRASES);
  const balanceSpan = findPhrase(text, BALANCE_PHRASES);
  const querySpan = findPhrase(text, QUERY_PHRASES);
  const rentSpan = findPhrase(text, RENT_PHRASES);
  const billSpan = findPhrase(text, BILL_PHRASES);

  if (rentSpan && findAmount(text, rentSpan)) {
    return shopResult("rent", text, raw, rentSpan, Boolean(paymentSpan));
  }
  if (billSpan && findAmount(text, billSpan) && !udhaarSpan) {
    return shopResult("bill", text, raw, billSpan, Boolean(paymentSpan));
  }
  if (paymentSpan && findAmount(text, paymentSpan)) {
    return withPhone(moneyResult("payment", text, raw, paymentSpan, customers), ident.phone);
  }
  if (udhaarSpan && findAmount(text, udhaarSpan) && !querySpan) {
    return withPhone(moneyResult("udhaar", text, raw, udhaarSpan, customers), ident.phone);
  }
  if (balanceSpan || querySpan || (udhaarSpan && querySpan)) {
    const span = earliest(balanceSpan, querySpan, udhaarSpan);
    return balanceResult(text, raw, span, customers);
  }
  if (addSpan) {
    const added = addResult(text, raw, addSpan);
    if (added.ok && added.intent === "add_customer" && !added.phone && ident.phone) return { ...added, phone: ident.phone };
    return added;
  }
  return { ok: false, raw };
}

function shopResult(
  intent: "rent" | "bill",
  text: string,
  raw: string,
  intentSpan: Span,
  paid: boolean,
): InterpretResult {
  const amount = findAmount(text, intentSpan);
  if (!amount) return { ok: false, raw };
  const residue = blank(text, [amount, intentSpan]);
  const note = cleanNote(
    tokenize(residue).filter((token) => {
      const lower = token.toLowerCase();
      return !PARTICLES.has(lower) && !INTENT_NOISE.has(lower) && !RENT_NOISE.has(lower) && !BILL_NOISE.has(lower);
    }),
  );
  const billKind = billKindFrom(text);
  const label = intent === "rent" ? "Kiraya" : billKind === "bijli" ? "Bijli" : billKind === "paani" ? "Paani" : "Bill";
  return {
    ok: true,
    intent,
    amount: amount.value,
    note,
    status: paid ? "paid" : "due",
    billKind,
    label,
    spokenDate: spokenDay(text),
    raw,
  };
}

function billKindFrom(text: string): "bijli" | "paani" | "other" {
  const lower = text.toLowerCase();
  if (/(bijli|बिजली|electricity|light bill)/i.test(lower)) return "bijli";
  if (/(paani|pani|पानी|water)/i.test(lower)) return "paani";
  return "other";
}

function spokenDay(text: string): string | undefined {
  const lower = text.toLowerCase();
  const today = indiaToday();
  if (/(^|\s)(aaj|आज)(\s|$)/i.test(lower)) return today;
  if (/(^|\s)(kal|कल)(\s|$)/i.test(lower)) return shiftISO(today, -1);
  if (/(^|\s)parso(\s|$)/i.test(lower)) return shiftISO(today, -2);
  const month = lower.match(/(\d{1,2})\s*(november|novambar|nov|नवंबर)/i);
  if (month) {
    const day = Math.min(31, Math.max(1, Number(month[1])));
    const year = Number(today.slice(0, 4));
    return `${year}-11-${String(day).padStart(2, "0")}`;
  }
  return undefined;
}

function indiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const RENT_NOISE = new Set(["kiraya", "kiraye", "rent", "किराया", "dukaan", "dukan", "shop"]);
const BILL_NOISE = new Set([
  "bill",
  "बिल",
  "bijli",
  "बिजली",
  "electricity",
  "light",
  "paani",
  "pani",
  "पानी",
  "water",
]);

function moneyResult(
  intent: "udhaar" | "payment",
  text: string,
  raw: string,
  intentSpan: Span,
  customers: NamedPerson[],
): InterpretResult {
  const amount = findAmount(text, intentSpan);
  if (!amount) return { ok: false, raw };
  const residue = blank(text, [amount, intentSpan]);
  const { name, note } = segment(residue, customers);
  if (!name) return { ok: false, raw };
  return {
    ok: true,
    intent,
    customerQuery: name,
    amount: amount.value,
      note,
      match: matchCustomers(name, customers),
      spokenDate: spokenDay(text),
      raw,
    };
}

function balanceResult(
  text: string,
  raw: string,
  span: Span | null,
  customers: NamedPerson[],
): InterpretResult {
  const residue = span ? blank(text, [span]) : text;
  const { name } = segment(residue, customers);
  if (!name) return { ok: false, raw };
  return {
    ok: true,
    intent: "balance",
    customerQuery: name,
    match: matchCustomers(name, customers),
    raw,
  };
}

function addResult(text: string, raw: string, span: Span): InterpretResult {
  const residue = blank(text, [span]);
  const { phone, rest } = extractPhone(residue);
  const tokens = tokenize(rest).filter((token) => !ADD_STOP.has(token.toLowerCase()));
  const name = titleCaseName(tokens.join(" "));
  if (name.length < 2) return { ok: false, raw };
  return { ok: true, intent: "add_customer", name, phone, raw };
}

function segment(residue: string, customers: NamedPerson[]): { name: string; note?: string } {
  const tokens = tokenize(residue).filter((token) => {
    const lower = token.toLowerCase();
    return !PARTICLES.has(lower) && !INTENT_NOISE.has(lower);
  });
  if (tokens.length === 0) return { name: "" };

  for (let count = Math.min(4, tokens.length); count >= 1; count--) {
    const query = tokens.slice(0, count).join(" ");
    const match = matchCustomers(query, customers);
    if (match.status === "one" || match.status === "many") {
      const matched = match.status === "one" ? match.customer.name : match.customers[0].name;
      if (nameTokens(query).length > nameTokens(matched).length) continue;
      const note = cleanNote(tokens.slice(count));
      return { name: query, note };
    }
  }

  const quantityAt = tokens.findIndex((token, index) => {
    const next = tokens[index + 1]?.toLowerCase() ?? "";
    if (!UNITS.has(next)) return false;
    return isNumber(token) || QTY_WORDS.has(token.toLowerCase());
  });
  if (quantityAt >= 0) {
    const noteStart = quantityAt > 0 ? quantityAt - 1 : quantityAt;
    const name = tokens.slice(0, noteStart).join(" ");
    const note = cleanNote(tokens.slice(noteStart));
    if (name) return { name, note };
  }

  return { name: tokens.join(" ") };
}

function cleanNote(tokens: string[]): string | undefined {
  const note = tokens.join(" ").trim();
  return note || undefined;
}

export function normalize(input: string): string {
  let text = input.normalize("NFC").trim();
  text = text.replace(/[०-९]/g, (digit) => String("०१२३४५६७८९".indexOf(digit)));
  text = text.replace(/(\d[\d,]*)\.(\d+)/g, (_, whole: string, frac: string) => {
    const value = Math.round(Number(`${whole.replace(/,/g, "")}.${frac}`));
    return String(value);
  });
  text = text.replace(/(\d),(?=\d)/g, "$1");
  text = text.replace(/\/-/g, " rupay ");
  text = text.replace(/[।॥?？!！।,;:|/\\()[\]{}"“”'`]/g, " ");
  text = text.replace(/₹/g, " ₹ ");
  text = text.replace(/[–—]/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

function findAddSpan(text: string): Span | null {
  const phrase = findPhrase(text, ADD_PHRASES);
  if (phrase) return phrase;
  const match = /^(?:please\s+|zara\s+|kripya\s+)?(add|ऐड)(?=\s|$)/i.exec(text);
  if (!match || match.index == null) return null;
  const word = match[1];
  const start = match[0].lastIndexOf(word);
  return { start, end: start + word.length };
}

function findPhrase(text: string, phrases: string[]): Span | null {
  const lower = text.toLowerCase();
  let best: (Span & { length: number }) | null = null;
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const start = lower.indexOf(needle, from);
      if (start < 0) break;
      const end = start + needle.length;
      const beforeOk = start === 0 || /\s/.test(lower[start - 1] ?? "");
      const afterOk = end === lower.length || /\s/.test(lower[end] ?? "");
      if (beforeOk && afterOk) {
        if (!best || needle.length > best.length || (needle.length === best.length && start < best.start)) {
          best = { start, end, length: needle.length };
        }
      }
      from = start + Math.max(1, needle.length);
    }
  }
  return best ? { start: best.start, end: best.end } : null;
}

function findAmount(text: string, intentSpan: Span | null): AmountHit | null {
  const confident = currencyAmounts(text);
  if (confident.length > 0) return nearest(confident, intentSpan);
  const hindi = findHindiAmount(text);
  if (hindi) return hindi;
  const pool = bareAmounts(text).filter((hit) => !looksLikePhoneFragment(text, hit));
  if (pool.length === 0) return null;
  return nearest(pool, intentSpan);
}

function nearest(pool: AmountHit[], intentSpan: Span | null): AmountHit {
  if (!intentSpan || pool.length === 1) return pool[0];
  return [...pool].sort((a, b) => spanDistance(a, intentSpan) - spanDistance(b, intentSpan))[0];
}

function looksLikePhoneFragment(text: string, hit: AmountHit): boolean {
  const digits = text.slice(hit.start, hit.end).replace(/\D/g, "");
  if (digits.length >= 8) return true;
  const before = text.slice(Math.max(0, hit.start - 24), hit.start).toLowerCase();
  return /\b(phone|ending|mobile|number)\b/.test(before);
}

function stripIdentity(text: string): { text: string; phone?: string } {
  const extracted = extractPhone(text);
  const rest = extracted.rest
    .replace(/\b(?:ending|last)\s+\d{4,9}\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { text: rest, phone: extracted.phone };
}

function withPhone(result: InterpretResult, phone?: string): InterpretResult {
  if (!phone || !result.ok || (result.intent !== "udhaar" && result.intent !== "payment")) return result;
  return { ...result, phone };
}

function currencyAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  const patterns = [
    /₹\s*(\d[\d,]*)/gi,
    /(?:rs\.?|inr)\s*(\d[\d,]*)/gi,
    /(\d[\d,]*)\s*(?:rupay|rupees|rupee|rupaye|rs\.?|inr|रुपये|रुपए|रुपया|रुपय)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = parseGrouped(match[1] ?? "");
      if (value == null || match.index == null) continue;
      hits.push({ value, start: match.index, end: match.index + match[0].length });
    }
  }
  return dedupeSpans(hits);
}

function bareAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  for (const match of text.matchAll(/(?<![\d,])(\d[\d,]*)(?![\d,])/g)) {
    const raw = match[1] ?? "";
    const value = parseGrouped(raw);
    if (value == null || match.index == null) continue;
    const after = text.slice(match.index + match[0].length).trimStart();
    const next = after.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (UNITS.has(next.replace(/[.,]/g, ""))) continue;
    if (raw.replace(/,/g, "").length >= 10) continue;
    hits.push({ value, start: match.index, end: match.index + match[0].length });
  }
  return hits;
}

function parseGrouped(raw: string): number | null {
  const digits = raw.replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000) return null;
  return value;
}

function dedupeSpans(hits: AmountHit[]): AmountHit[] {
  const sorted = [...hits].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: AmountHit[] = [];
  for (const hit of sorted) {
    const overlaps = kept.some((item) => hit.start < item.end && hit.end > item.start);
    if (!overlaps) kept.push(hit);
  }
  return kept;
}

function spanDistance(a: Span, b: Span): number {
  if (a.end <= b.start) return b.start - a.end;
  if (b.end <= a.start) return a.start - b.end;
  return 0;
}

function blank(text: string, spans: Span[]): string {
  const chars = [...text];
  for (const span of spans) {
    for (let i = span.start; i < span.end && i < chars.length; i++) chars[i] = " ";
  }
  return chars.join("");
}

function extractPhone(text: string): { phone?: string; rest: string } {
  const patterns = [
    /(?:\+91[\s-]*)?(?<!\d)([6-9]\d{4})\s(\d{5})(?!\d)/,
    /(?:\+91[\s-]*)?(?<!\d)([6-9]\d{9})(?!\d)/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match || match.index == null) continue;
    const phone = `${match[1] ?? ""}${match[2] ?? ""}`;
    if (phone.length !== 10) continue;
    const rest = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
    return { phone, rest };
  }
  return { rest: text };
}

function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function titleCaseName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/[a-z]/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    })
    .join(" ")
    .trim();
}

function earliest(...spans: Array<Span | null>): Span | null {
  const present = spans.filter((span): span is Span => Boolean(span));
  if (present.length === 0) return null;
  return present.sort((a, b) => a.start - b.start)[0];
}

function isNumber(token: string): boolean {
  return /^\d[\d,]*$/.test(token);
}

function parseOverdueRentQuery(text: string): InterpretResult | null {
  const lower = text.toLowerCase();
  if (
    /(kiska|kis kis ka|kis-kiska|who owes)\s+(kiraya|rent).*(baaki|baki|baqi|overdue|pending)/i.test(lower) ||
    /(kiraya|rent)\s+(kiska|kis kis ka).*(baaki|baki|baqi|overdue|pending)/i.test(lower) ||
    /(overdue|pending)\s+(rent|kiraya)/i.test(lower) ||
    /(kis|kiska|who).*(kiraya|rent)\s+(baaki|baki|due)/i.test(lower) ||
    /(किसका|किराया किसका|किसका किराया).*(बाकी|बकाया)/i.test(lower)
  ) {
    return { ok: true, intent: "rent_overdue_query", raw: text };
  }
  return null;
}

function parseReturnRental(text: string, raw: string, customers: NamedPerson[]): InterpretResult | null {
  const lower = text.toLowerCase();
  const returnMatch = /(wapas\s+kar\s+di\s+hai|wapas\s+kar\s+di|wapas\s+kar\s+diya|wapas\s+kiya|wapas\s+di|lautaya|lautayi|lautaye|वापस\s+कर\s+दी|वापस\s+कर\s+दिया|वापस\s+की|लौटाया|लौटा\s+दी)/i.exec(lower);
  if (!returnMatch) return null;

  const neMatch = /([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+ne\s+(.*?)\s+(?:wapas|return|lautaya)/i.exec(text);
  let customerQuery: string | undefined;
  let assetQuery = "";
  let matchedPerson: MatchResult | undefined;

  if (neMatch) {
    customerQuery = neMatch[1].trim();
    assetQuery = neMatch[2].trim();
    matchedPerson = matchCustomers(customerQuery, customers);
  } else {
    const residue = (text.slice(0, returnMatch.index) + " " + text.slice(returnMatch.index + returnMatch[0].length)).trim();
    const tokens = tokenize(residue).filter((t) => !PARTICLES.has(t.toLowerCase()) && !INTENT_NOISE.has(t.toLowerCase()));
    if (tokens.length === 0) return null;

    for (let count = Math.min(3, tokens.length); count >= 1; count--) {
      const candidate = tokens.slice(0, count).join(" ");
      const m = matchCustomers(candidate, customers);
      if (m.status === "one" || m.status === "many") {
        customerQuery = candidate;
        matchedPerson = m;
        assetQuery = tokens.slice(count).join(" ");
        break;
      }
    }
    if (!customerQuery) {
      assetQuery = tokens.join(" ");
    }
  }

  assetQuery = assetQuery.replace(/\b(ko|se|ka|ki|ke|ne)\b/gi, "").trim();

  return {
    ok: true,
    intent: "return_rental",
    assetQuery: assetQuery || "Equipment",
    customerQuery,
    match: matchedPerson,
    raw,
  };
}

function parseStartRental(text: string, raw: string, customers: NamedPerson[]): InterpretResult | null {
  const lower = text.toLowerCase();
  const rentalMarker = /(ke\s+liye\s+di\b|ke\s+liye\s+diya\b|kiraye?\s+par\s+di\b|kiraye?\s+par\s+diya\b|kiraye?\s+pe\s+di\b|kiraye?\s+pe\s+diya\b|rent\s+par\s+di\b|rent\s+pe\s+di\b|rent\s+diya\b)/i.exec(lower);
  if (!rentalMarker) return null;

  let days: number | undefined;
  const daysMatch = /(\d+)\s*(?:din|days?|दिन)/i.exec(lower);
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
  }

  let rate = 0;
  let ratePeriod: "per_day" | "per_week" | "per_month" | "one_time" = "per_day";
  const rateMatch = /(\d[\d,]*)\s*(roz|per\s*day|\/day|daily|hafta|hafte|per\s*week|mahina|mahine|per\s*month|\/month|month)/i.exec(lower);
  if (rateMatch) {
    rate = parseInt(rateMatch[1].replace(/,/g, ""), 10);
    const unit = rateMatch[2].toLowerCase();
    if (unit.includes("hafta") || unit.includes("week")) ratePeriod = "per_week";
    else if (unit.includes("mahina") || unit.includes("month")) ratePeriod = "per_month";
    else ratePeriod = "per_day";
  } else {
    const amt = bareAmounts(text);
    if (amt.length > 0) {
      rate = amt[0].value;
      if (days && days > 0) ratePeriod = "per_day";
      else ratePeriod = "per_month";
    }
  }

  let customerQuery = "";
  let assetQuery = "";
  const koMatch = /(.*?)\s+([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+ko\b/i.exec(text.slice(0, rentalMarker.index));
  if (koMatch) {
    assetQuery = koMatch[1].trim();
    customerQuery = koMatch[2].trim();
  } else {
    const beforeMarker = text.slice(0, rentalMarker.index);
    const tokens = tokenize(beforeMarker);
    for (let c = Math.min(3, tokens.length); c >= 1; c--) {
      const cand = tokens.slice(tokens.length - c).join(" ");
      const m = matchCustomers(cand, customers);
      if (m.status === "one" || m.status === "many") {
        customerQuery = cand;
        assetQuery = tokens.slice(0, tokens.length - c).join(" ");
        break;
      }
    }
  }

  if (!customerQuery) customerQuery = "Customer";
  if (!assetQuery) assetQuery = "Asset";

  return {
    ok: true,
    intent: "start_rental",
    assetQuery: assetQuery.replace(/\b(ko|ne|ka|ki|ke)\b/gi, "").trim(),
    customerQuery: customerQuery.trim(),
    days,
    rate,
    ratePeriod,
    match: matchCustomers(customerQuery, customers),
    raw,
  };
}

function parseRentReceived(text: string, raw: string, customers: NamedPerson[]): InterpretResult | null {
  const lower = text.toLowerCase();
  const rentWord = findPhrase(text, RENT_PHRASES);
  if (!rentWord) return null;

  const hasPayment = /(diya|diye|de\s+diya|de\s+diye|mila|mile|jama|paid|received|दिए|दिया|मिला|मिले|जमा)/i.test(lower);
  if (!hasPayment) return null;

  const amt = findAmount(text, rentWord);
  if (!amt) return null;

  const neMatch = /([a-zA-Z\u0900-\u097F]+(?:\s+[a-zA-Z\u0900-\u097F]+)?)\s+(?:ne|se)\b/i.exec(text);
  let customerQuery = "";
  let assetQuery: string | undefined;

  if (neMatch) {
    customerQuery = neMatch[1].replace(/\b(ji|bhai|sahab)\b/gi, "").trim();
  }

  const assetMatch = /\b([a-zA-Z\u0900-\u097F]+)\s+(?:ka|ki|ke)\s+(?:(?:₹\s*)?[\d,]+\s*(?:rupay|rupees|rupaye)?\s*)?(?:kiraya|rent)/i.exec(lower);
  if (assetMatch && !["dukaan", "dukan", "shop"].includes(assetMatch[1].toLowerCase())) {
    assetQuery = assetMatch[1];
  }

  if (!customerQuery) {
    for (const c of customers) {
      if (lower.includes(c.name.toLowerCase())) {
        customerQuery = c.name;
        break;
      }
    }
  }

  if (customerQuery || (assetQuery && !lower.includes("dukaan") && !lower.includes("dukan"))) {
    return {
      ok: true,
      intent: "rent_received",
      customerQuery: customerQuery || "Kirayedaar",
      assetQuery: assetQuery || "Property",
      amount: amt.value,
      match: matchCustomers(customerQuery || "Kirayedaar", customers),
      spokenDate: spokenDay(text),
      raw,
    };
  }
  return null;
}

