export interface LedgerRow {
  id: string;
  type: "udhaar" | "payment";
  amount: number;
  createdAt: string;
  insertedAt: string;
}

/** Business time, then the real insert time, so a same-noon stamp cannot put a later payment first. */
export function settleBalances(rows: LedgerRow[]): { id: string; balance: number }[] {
  const ordered = [...rows].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.insertedAt.localeCompare(b.insertedAt) || a.id.localeCompare(b.id),
  );
  let balance = 0;
  return ordered.map((row) => {
    balance += row.type === "udhaar" ? row.amount : -row.amount;
    return { id: row.id, balance };
  });
}

export function currentBalance(rows: LedgerRow[]): number {
  const settled = settleBalances(rows);
  return settled.length === 0 ? 0 : settled[settled.length - 1].balance;
}
