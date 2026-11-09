import { describe, expect, it } from "vitest";
import { tx } from "@/lib/i18n";
import { compactMemory, keepCustomer, pickMainContacts, shouldSendOnKey } from "@/lib/product";

describe("language chrome", () => {
  it("keeps Hinglish by default and renames the books in English", () => {
    expect(tx("hinglish", "nav_udhaar")).toBe("Udhaar");
    expect(tx("en", "nav_udhaar")).toBe("Credit");
    expect(tx("en", "nav_jama")).toBe("Payments");
    expect(tx("en", "nav_baat")).toBe("Chat");
    expect(tx(undefined, "nav_kiraya")).toBe("Kiraya");
  });
});

describe("chat composer", () => {
  it("sends on Enter and keeps Shift+Enter and IME composition", () => {
    expect(shouldSendOnKey({ key: "Enter", shiftKey: false, composing: false })).toBe(true);
    expect(shouldSendOnKey({ key: "Enter", shiftKey: true, composing: false })).toBe(false);
    expect(shouldSendOnKey({ key: "Enter", shiftKey: false, composing: true })).toBe(false);
    expect(shouldSendOnKey({ key: "a", shiftKey: false, composing: false })).toBe(false);
  });
});

describe("unused contacts", () => {
  const now = Date.parse("2026-11-07T12:00:00.000Z");

  it("keeps people with a ledger, a balance, a bill/rent name, or a fresh confirm", () => {
    expect(keepCustomer({ hasEntries: true, balance: 0, matchesRecord: false, insertedAt: null, now })).toBe(true);
    expect(keepCustomer({ hasEntries: false, balance: 40, matchesRecord: false, insertedAt: null, now })).toBe(true);
    expect(keepCustomer({ hasEntries: false, balance: 0, matchesRecord: true, insertedAt: null, now })).toBe(true);
    expect(keepCustomer({ hasEntries: false, balance: 0, matchesRecord: false, insertedAt: new Date(now - 60_000).toISOString(), now })).toBe(true);
  });

  it("drops an empty contact once the grace window has passed", () => {
    expect(keepCustomer({ hasEntries: false, balance: 0, matchesRecord: false, insertedAt: new Date(now - 11 * 60_000).toISOString(), now })).toBe(false);
    expect(keepCustomer({ hasEntries: false, balance: 0, matchesRecord: false, insertedAt: null, now })).toBe(false);
  });
});

describe("main contacts and memory", () => {
  it("sends active people first and skips a zero-balance stranger", () => {
    const picked = pickMainContacts(
      [
        { id: "old", balance: 0 },
        { id: "owe", balance: 250 },
        { id: "recent", balance: 0 },
      ],
      ["recent"],
      12,
    );
    expect(picked.map((person) => person.id)).toEqual(["recent", "owe"]);
  });

  it("compacts the memory graph onto one line per person", () => {
    const line = compactMemory([{ name: "Ramesh Kumar", phone: "9000011111", balance: 250, lastAmount: 250, lastNote: "atta", lastIntent: "udhaar" }]);
    expect(line).toContain("Ramesh Kumar");
    expect(line).toContain("9000011111");
    expect(line).toContain("atta");
    expect(line.split("\n")).toHaveLength(1);
  });
});
