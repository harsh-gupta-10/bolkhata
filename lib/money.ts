/** Whole rupees only. Decimals, signs, and exponents are rejected, not rewritten. */
export function wholeRupees(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0 || value > 100_000_000) return null;
    return value;
  }
  const text = String(value ?? "")
    .trim()
    .replace(/₹/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "");
  if (!/^\d+$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 100_000_000) return null;
  return amount;
}
