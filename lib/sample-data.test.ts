import { describe, expect, it } from "vitest";
import {
  SAMPLE_LINES,
  SAMPLE_PEOPLE,
  SAMPLE_RECORDS,
  SAMPLE_RENTAL_AGREEMENTS,
  SAMPLE_RENTAL_ASSETS,
  SAMPLE_SUPPLIER_PURCHASES,
  sampleStatus,
} from "@/lib/sample-data";

describe("sample data idempotency", () => {
  it("asks for every fictional line on an empty shop", () => {
    const status = sampleStatus({ customers: [], entries: [], records: [] });
    expect(status.complete).toBe(false);
    expect(status.missingPeople).toEqual(SAMPLE_PEOPLE.map((p) => p.name));
    expect(status.missingLines).toHaveLength(SAMPLE_LINES.length);
  });

  it("treats a second load as a no-op once the same lines exist", () => {
    const status = sampleStatus({
      customers: SAMPLE_PEOPLE.map((person) => ({ name: person.name, phone: person.phone })),
      entries: SAMPLE_LINES.map((line) => {
        const p = SAMPLE_PEOPLE.find((pers) => pers.name === line.name);
        return {
          customerName: line.name,
          customerPhone: p?.phone || "",
          type: line.type,
          amount: line.amount,
          note: line.note,
        };
      }),
      records: SAMPLE_RECORDS.map((rec) => ({
        kind: rec.kind,
        party: rec.party,
        amount: rec.amount,
      })),
    });
    expect(status.complete).toBe(true);
    expect(status.missingLines).toEqual([]);
    expect(status.missingPeople).toEqual([]);
    expect(status.missingRecords).toEqual([]);
  });

  it("does not ask for another Imran credit when that note is already there", () => {
    const status = sampleStatus({
      customers: [{ name: "Imran Sheikh" }],
      entries: [{ customerName: "Imran Sheikh", customerPhone: "9000033333", type: "udhaar", amount: 150, note: "tel 1 litre" }],
      records: [],
    });
    expect(status.missingLines.some((line) => line.includes("tel 1 litre"))).toBe(false);
    expect(status.missingPeople).toContain("Ramesh Kumar");
  });

  it("enforces strict synthetic phone rules (90000 xxxxx) across all people and suppliers", () => {
    expect(SAMPLE_PEOPLE.length).toBeGreaterThanOrEqual(8);
    for (const person of SAMPLE_PEOPLE) {
      expect(person.phone).toMatch(/^90000\d{5}$/);
    }
    for (const supplier of SAMPLE_SUPPLIER_PURCHASES) {
      if (supplier.supplierPhone) {
        expect(supplier.supplierPhone).toMatch(/^90000\d{5}$/);
      }
    }
  });

  it("ensures rental agreements only link to defined sample assets and people", () => {
    const assetNames = new Set(SAMPLE_RENTAL_ASSETS.map((a) => a.name));
    const peopleNames = new Set(SAMPLE_PEOPLE.map((p) => p.name));

    expect(SAMPLE_RENTAL_ASSETS.length).toBeGreaterThanOrEqual(5);
    expect(SAMPLE_RENTAL_AGREEMENTS.length).toBeGreaterThanOrEqual(4);

    for (const ag of SAMPLE_RENTAL_AGREEMENTS) {
      expect(assetNames.has(ag.assetName)).toBe(true);
      expect(peopleNames.has(ag.customerName)).toBe(true);
      expect(ag.rate).toBeGreaterThan(0);
      expect(ag.depositTaken).toBeGreaterThanOrEqual(0);
    }
  });
});
