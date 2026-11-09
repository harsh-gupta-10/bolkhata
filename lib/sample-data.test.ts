import { describe, expect, it } from "vitest";
import { SAMPLE_LINES, sampleStatus } from "@/lib/sample-data";

const people = [
  { name: "Ramesh Kumar" },
  { name: "Sita Devi" },
  { name: "Imran Sheikh" },
];

describe("sample data idempotency", () => {
  it("asks for every fictional line on an empty shop", () => {
    const status = sampleStatus({ customers: [], entries: [], records: [] });
    expect(status.complete).toBe(false);
    expect(status.missingPeople).toEqual(["Ramesh Kumar", "Sita Devi", "Imran Sheikh"]);
    expect(status.missingLines).toHaveLength(SAMPLE_LINES.length);
  });

  it("treats a second load as a no-op once the same lines exist", () => {
    const status = sampleStatus({
      customers: people.map((person) => ({ ...person, phone: person.name === "Ramesh Kumar" ? "9000011111" : person.name === "Sita Devi" ? "9000022222" : "9000033333" })),
      entries: SAMPLE_LINES.map((line) => ({
        customerName: line.name,
        customerPhone: line.name === "Ramesh Kumar" ? "9000011111" : line.name === "Sita Devi" ? "9000022222" : "9000033333",
        type: line.type,
        amount: line.amount,
        note: line.note,
      })),
      records: [
        { kind: "rent", party: "Sample landlord", amount: 15000 },
        { kind: "bill", party: "Sample discom", amount: 1450 },
      ],
    });
    expect(status.complete).toBe(true);
    expect(status.missingLines).toEqual([]);
  });

  it("does not ask for another Imran credit when that note is already there", () => {
    const status = sampleStatus({
      customers: [{ name: "Imran Sheikh" }],
      entries: [{ customerName: "Imran Sheikh", customerPhone: "9000033333", type: "udhaar", amount: 150, note: "tel 1 litre" }],
      records: [],
    });
    expect(status.missingLines.some((line) => line.includes("imran"))).toBe(false);
    expect(status.missingPeople).toContain("Ramesh Kumar");
  });
});
