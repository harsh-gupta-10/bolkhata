import { phonetic } from "@/lib/hindi";

export interface NamedPerson {
  id: string;
  name: string;
}

export type MatchResult =
  | { status: "one"; customer: NamedPerson }
  | { status: "many"; customers: NamedPerson[] }
  | { status: "none" };

const HONORIFICS = new Set(["ji", "bhai", "bhaiya", "sahab", "sahib", "sir", "madam"]);

export function nameTokens(name: string): string[] {
  return phonetic(name)
    .split(" ")
    .filter((token) => token && !HONORIFICS.has(token));
}

/**
 * Full-name match, or a unique first name.
 * "Ramesh" → Ramesh Kumar when he is the only Ramesh.
 * Two Rameshes → ambiguous list for "Kaunsa Ramesh?".
 * Last name alone does not match.
 */
export function matchCustomers(query: string, customers: NamedPerson[]): MatchResult {
  const queryTokens = nameTokens(query);
  if (queryTokens.length === 0) return { status: "none" };
  const foldedQuery = queryTokens.join(" ");

  const rows = customers.map((customer) => {
    const tokens = nameTokens(customer.name);
    return { customer, tokens, full: tokens.join(" ") };
  });

  const exact = rows.filter((row) => row.full === foldedQuery && row.full.length > 0);
  if (exact.length === 1) return { status: "one", customer: exact[0].customer };
  if (exact.length > 1) return { status: "many", customers: exact.map((row) => row.customer) };

  if (queryTokens.length >= 2) {
    const partial = rows.filter(
      (row) =>
        row.full === foldedQuery ||
        row.full.startsWith(`${foldedQuery} `) ||
        foldedQuery.startsWith(`${row.full} `),
    );
    if (partial.length === 1) return { status: "one", customer: partial[0].customer };
    if (partial.length > 1) return { status: "many", customers: partial.map((row) => row.customer) };
  }

  if (queryTokens.length === 1) {
    const first = rows.filter((row) => row.tokens[0] === queryTokens[0]);
    if (first.length === 1) return { status: "one", customer: first[0].customer };
    if (first.length > 1) return { status: "many", customers: first.map((row) => row.customer) };
  }

  return { status: "none" };
}
