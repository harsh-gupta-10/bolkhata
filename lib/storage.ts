import { emptyLedger, type Ledger } from "@/lib/types";

export const LEDGER_STORAGE_KEY = "bolkhata.v1";

export function loadLedger(): Ledger {
  if (typeof window === "undefined") return emptyLedger();
  try {
    const raw = window.localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) return emptyLedger();
    const parsed = JSON.parse(raw) as {
      version?: number;
      customers?: Ledger["customers"];
      shop?: Ledger["shop"];
      messages?: Ledger["messages"];
    };
    if ((parsed.version !== 1 && parsed.version !== 2) || !Array.isArray(parsed.customers)) return emptyLedger();
    return {
      version: 2,
      customers: parsed.customers,
      shop: Array.isArray(parsed.shop) ? parsed.shop : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return emptyLedger();
  }
}

export function saveLedger(ledger: Ledger): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger));
}
