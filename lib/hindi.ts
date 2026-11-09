/**
 * Spoken Hindi numbers in Latin script, matching the Timbre prompt style:
 * 250 → "do sau pachaas rupay".
 */
export const UNDER_HUNDRED = [
  "shunya",
  "ek",
  "do",
  "teen",
  "chaar",
  "paanch",
  "chhe",
  "saat",
  "aath",
  "nau",
  "das",
  "gyarah",
  "barah",
  "terah",
  "chaudah",
  "pandrah",
  "solah",
  "satrah",
  "atharah",
  "unnis",
  "bees",
  "ikkees",
  "baais",
  "teis",
  "chaubis",
  "pachchis",
  "chhabbis",
  "sattaais",
  "atthaais",
  "unatees",
  "tees",
  "ikatees",
  "battees",
  "taintees",
  "chauntees",
  "paintees",
  "chhattis",
  "saintees",
  "adtees",
  "untalis",
  "chaalis",
  "iktalis",
  "bayalis",
  "taintalis",
  "chawalis",
  "paintalis",
  "chhiyalis",
  "saintalis",
  "adtalis",
  "unchas",
  "pachaas",
  "ikyavan",
  "bavan",
  "tirpan",
  "chauvan",
  "pachpan",
  "chhappan",
  "sattavan",
  "athavan",
  "unsath",
  "saath",
  "iksath",
  "basath",
  "tirsath",
  "chausath",
  "painsath",
  "chhiyasath",
  "sarsath",
  "adsath",
  "unhattar",
  "sattar",
  "ikhattar",
  "bahattar",
  "tihattar",
  "chauhattar",
  "pachhattar",
  "chhihattar",
  "satattar",
  "athhattar",
  "unasi",
  "assi",
  "ikyasi",
  "bayasi",
  "tirasi",
  "chaurasi",
  "pachasi",
  "chhiyasi",
  "satasi",
  "athasi",
  "navasi",
  "nabbe",
  "ikyanve",
  "banve",
  "tiranve",
  "chauranve",
  "pachanve",
  "chhiyanve",
  "satanve",
  "athanve",
  "ninyanve",
] as const;

const WORD_VALUE: Record<string, number> = {};
UNDER_HUNDRED.forEach((word, index) => {
  if (index > 0) WORD_VALUE[word] = index;
});

const WORD_ALIASES: Record<string, number> = {
  char: 4,
  panch: 5,
  pachas: 50,
  pacchas: 50,
  che: 6,
  chhah: 6,
  sat: 7,
  ath: 8,
  aat: 8,
  nao: 9,
  dus: 10,
  gyarah: 11,
  bara: 12,
  barah: 12,
  solah: 16,
  bees: 20,
  bis: 20,
};

for (const [word, value] of Object.entries(WORD_ALIASES)) {
  if (WORD_VALUE[word] == null) WORD_VALUE[word] = value;
}

const MULTIPLIER: Record<string, number> = {
  sau: 100,
  hazaar: 1000,
  hazar: 1000,
  hajaar: 1000,
  hajjar: 1000,
  lakh: 100000,
  lac: 100000,
  crore: 10000000,
  karod: 10000000,
};

const CURRENCY_WORDS = new Set([
  "rupay",
  "rupees",
  "rupee",
  "rupaye",
  "rupaye.",
  "rs",
  "inr",
  "रुपये",
  "रुपए",
  "रुपया",
  "रुपय",
]);

function underHundred(n: number): string {
  if (n <= 0) return "";
  return UNDER_HUNDRED[n] ?? "";
}

function underThousand(n: number): string {
  if (n < 100) return underHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${underHundred(hundreds)} sau`;
  return rest ? `${head} ${underHundred(rest)}` : head;
}

export function indianNumberWords(amount: number): string {
  const n = Math.floor(Math.abs(amount));
  if (n === 0) return "shunya";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${underThousand(crore)} crore`);
  if (lakh) parts.push(`${underThousand(lakh)} lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} hazaar`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

/** "do sau pachaas rupay" — always words, never digits. */
export function toSpokenRupees(amount: number): string {
  const n = Math.round(amount);
  const words = indianNumberWords(Math.abs(n));
  return n < 0 ? `minus ${words} rupay` : `${words} rupay`;
}

/**
 * Safety net before Timbre: any digit run becomes spoken rupees.
 * Already-spoken text (no digits) is unchanged.
 */
export function ensureSpokenNumbers(text: string): string {
  return text.replace(/₹\s*\d[\d,]*|\b\d[\d,]*\b/g, (match) => {
    const n = Number(match.replace(/[^\d]/g, ""));
    if (!Number.isFinite(n)) return match;
    return toSpokenRupees(n);
  });
}

export function isCurrencyWord(token: string): boolean {
  return CURRENCY_WORDS.has(token.toLowerCase().replace(/[.,]/g, ""));
}

export interface HindiAmount {
  value: number;
  start: number;
  end: number;
}

/**
 * Parse a Latin Hinglish amount such as "do sau pachaas rupay".
 * Requires a multiplier (sau/hazaar/…) or a trailing currency word,
 * so a stray "do" in "likh do" is not money.
 */
export function findHindiAmount(text: string): HindiAmount | null {
  const tokens = tokenize(text);
  let best: HindiAmount | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const parsed = parseFrom(tokens, i);
    if (!parsed) continue;
    const candidate: HindiAmount = {
      value: parsed.value,
      start: tokens[i].start,
      end: tokens[parsed.endIndex].end,
    };
    if (!best || candidate.end - candidate.start > best.end - best.start) best = candidate;
  }
  return best;
}

function parseFrom(
  tokens: Token[],
  start: number,
): { value: number; endIndex: number; followedByCurrency: boolean } | null {
  let i = start;
  let result = 0;
  let current = 0;
  let saw = false;
  let sawMultiplier = false;
  while (i < tokens.length) {
    const token = normalizeToken(tokens[i].token);
    const mult = MULTIPLIER[token];
    if (mult) {
      if (current === 0) current = 1;
      current *= mult;
      saw = true;
      sawMultiplier = true;
      if (mult >= 1000) {
        result += current;
        current = 0;
      }
      i += 1;
      continue;
    }
    if (WORD_VALUE[token] != null) {
      current += WORD_VALUE[token];
      saw = true;
      i += 1;
      continue;
    }
    break;
  }
  if (!saw) return null;
  let endIndex = i - 1;
  let followedByCurrency = false;
  if (i < tokens.length && isCurrencyWord(tokens[i].token)) {
    endIndex = i;
    followedByCurrency = true;
  }
  if (!sawMultiplier && !followedByCurrency) return null;
  const value = result + current;
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000) return null;
  return { value, endIndex, followedByCurrency };
}

interface Token {
  token: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    tokens.push({ token: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

const INDEPENDENT: Record<string, string> = {
  अ: "a",
  आ: "aa",
  इ: "i",
  ई: "ee",
  उ: "u",
  ऊ: "oo",
  ए: "e",
  ऐ: "ai",
  ओ: "o",
  औ: "au",
  ऋ: "ri",
  ऑ: "o",
};

const CONS: Record<string, string> = {
  क: "k",
  ख: "kh",
  ग: "g",
  घ: "gh",
  ङ: "ng",
  च: "ch",
  छ: "chh",
  ज: "j",
  झ: "jh",
  ञ: "ny",
  ट: "t",
  ठ: "th",
  ड: "d",
  ढ: "dh",
  ण: "n",
  त: "t",
  थ: "th",
  द: "d",
  ध: "dh",
  न: "n",
  प: "p",
  फ: "ph",
  ब: "b",
  भ: "bh",
  म: "m",
  य: "y",
  र: "r",
  ल: "l",
  व: "v",
  श: "sh",
  ष: "sh",
  स: "s",
  ह: "h",
  ळ: "l",
};

const MATRA: Record<string, string> = {
  "ा": "aa",
  "ि": "i",
  "ी": "ee",
  "ु": "u",
  "ू": "oo",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au",
  "ृ": "ri",
  "ॉ": "o",
  "ॅ": "e",
};

function consonantBase(chars: string[], index: number): { latin: string; extra: number } | null {
  const ch = chars[index];
  if (!CONS[ch]) return null;
  const nukta = chars[index + 1] === "़";
  let latin = CONS[ch];
  if (nukta) {
    if (ch === "क") latin = "q";
    else if (ch === "फ") latin = "f";
    else if (ch === "ज") latin = "z";
    else if (ch === "ख") latin = "kh";
    else if (ch === "ग") latin = "g";
    else if (ch === "ड") latin = "d";
    else if (ch === "ढ") latin = "d";
  }
  return { latin, extra: nukta ? 1 : 0 };
}

export function transliterateWord(word: string): string {
  const chars = Array.from(word.normalize("NFC").replace(/[\u200c\u200d]/g, ""));
  const pieces: { latin: string; inherent: boolean }[] = [];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "्" || ch === "़") continue;
    if (ch === "ं" || ch === "ँ") {
      pieces.push({ latin: "n", inherent: false });
      continue;
    }
    if (ch === "ः") {
      pieces.push({ latin: "h", inherent: false });
      continue;
    }
    if (INDEPENDENT[ch]) {
      pieces.push({ latin: INDEPENDENT[ch], inherent: false });
      continue;
    }
    if (MATRA[ch]) {
      pieces.push({ latin: MATRA[ch], inherent: false });
      continue;
    }
    const base = consonantBase(chars, i);
    if (base) {
      const next = chars[i + base.extra + 1];
      if (next === "्") {
        pieces.push({ latin: base.latin, inherent: false });
        i += base.extra + 1;
        continue;
      }
      if (next && MATRA[next]) {
        pieces.push({ latin: base.latin + MATRA[next], inherent: false });
        i += base.extra + 1;
        continue;
      }
      pieces.push({ latin: base.latin + "a", inherent: true });
      i += base.extra;
      continue;
    }
    pieces.push({ latin: ch, inherent: false });
  }

  return pieces
    .map((piece, index) => {
      const keepFirstSchwa = index === 0 && pieces.length > 1;
      if (piece.inherent && !keepFirstSchwa) return piece.latin.replace(/a$/, "");
      return piece.latin;
    })
    .join("");
}

export function transliterate(input: string): string {
  return input
    .split(/(\s+)/)
    .map((part) => (/^\s+$/.test(part) ? part : transliterateWord(part)))
    .join("");
}

/** Casefold + Devanagari transliteration for customer matching. */
export function phonetic(input: string): string {
  let text = transliterate(input).toLowerCase();
  text = text.replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u");
  text = text.replace(/sheikh/g, "shekh").replace(/shaikh/g, "shekh");
  text = text.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return text;
}
