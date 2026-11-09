import { describe, expect, it } from "vitest";
import { istLocalInput, isoFromIstLocal } from "@/lib/format";
import { currentBalance, settleBalances } from "@/lib/ledger-math";
import { wholeRupees } from "@/lib/money";

describe("payment remaining balance", () => {
  it("keeps ₹100 after ₹150 udhaar then ₹50 payment even when both share a clock time", () => {
    const noon = "2026-11-09T06:30:00.000Z";
    const rows = [
      { id: "pay", type: "payment" as const, amount: 50, createdAt: noon, insertedAt: "2026-11-09T01:32:10.000Z" },
      { id: "udhaar", type: "udhaar" as const, amount: 150, createdAt: noon, insertedAt: "2026-11-09T01:31:00.000Z" },
    ];
    const settled = Object.fromEntries(settleBalances(rows).map((row) => [row.id, row.balance]));
    expect(settled.udhaar).toBe(150);
    expect(settled.pay).toBe(100);
    expect(currentBalance(rows)).toBe(100);
  });
});

describe("IST edit round-trip", () => {
  it("shows 7:02 IST in the editor and saves the same instant", () => {
    const stored = "2026-11-09T01:32:00.000Z";
    const field = istLocalInput(stored);
    expect(field).toBe("2026-11-09T07:02");
    expect(isoFromIstLocal(field)).toBe(stored);
  });
});

describe("whole rupees", () => {
  it("rejects decimals, signs, and exponents", () => {
    expect(wholeRupees("12.50")).toBeNull();
    expect(wholeRupees("-250")).toBeNull();
    expect(wholeRupees("1e3")).toBeNull();
    expect(wholeRupees("250")).toBe(250);
    expect(wholeRupees(250)).toBe(250);
  });
});
