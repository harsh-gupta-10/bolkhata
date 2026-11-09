import { describe, expect, it } from "vitest";
import { actionSummary, peopleWriteReady, phoneDigits, presentPeople, projectBalance, type ShopPerson } from "@/lib/confirm";

const people: ShopPerson[] = [
  { id: "1", name: "Ramesh Kumar", phone: "9000011111", balance: 230 },
  { id: "2", name: "Sita Devi", phone: "9000022222", balance: 280 },
  { id: "4", name: "Ramesh Yadav", phone: "9000044444", balance: 40 },
];

describe("confirmation matching", () => {
  it("names the one person and their phone", () => {
    const presented = presentPeople("Sita", people);
    expect(presented.kind).toBe("one");
    if (presented.kind !== "one") return;
    expect(presented.person.phone).toBe("9000022222");
    expect(presented.summary).toContain("Sita Devi");
    expect(presented.summary).toContain("9000022222");
  });

  it("lists every similar name with a phone for Kaunsa wala", () => {
    const presented = presentPeople("Ramesh", people);
    expect(presented.kind).toBe("many");
    if (presented.kind !== "many") return;
    expect(presented.summary).toBe("Kaunsa wala?");
    expect(presented.people.map((person) => person.phone)).toEqual(["9000011111", "9000044444"]);
  });

  it("offers to create someone who is not in the book", () => {
    const presented = presentPeople("Geeta Ben", people);
    expect(presented.kind).toBe("none");
  });

  it("summarises the write with name, phone, amount, and the next balance", () => {
    const line = actionSummary({
      intent: "udhaar",
      name: "Ramesh Kumar",
      phone: "9000011111",
      amount: 250,
      note: "atta 5 kilo",
      balanceAfter: projectBalance(230, "udhaar", 250),
    });
    expect(line).toContain("Ramesh Kumar");
    expect(line).toContain("9000011111");
    expect(line).toContain("₹250");
    expect(line).toContain("atta 5 kilo");
    expect(line).toContain("₹480");
    expect(projectBalance(250, "payment", 500)).toBe(-250);
  });

  it("blocks a people write until the phone has 10 digits", () => {
    expect(phoneDigits("90000 11111")).toBe("9000011111");
    expect(phoneDigits("111")).toBeNull();
    expect(
      peopleWriteReady({
        intent: "udhaar",
        name: "Ramesh Kumar",
        phone: "",
        amount: 250,
        ambiguous: false,
        personChosen: false,
      }).ok,
    ).toBe(false);
    expect(
      peopleWriteReady({
        intent: "udhaar",
        name: "Ramesh Kumar",
        phone: "90000 11111",
        amount: 250,
        ambiguous: false,
        personChosen: false,
      }),
    ).toMatchObject({ ok: true });
    expect(
      peopleWriteReady({
        intent: "payment",
        name: "Ramesh",
        phone: "9000011111",
        amount: 100,
        ambiguous: true,
        personChosen: false,
      }).reason,
    ).toContain("Kaunsa wala?");
  });

  it("does not describe a balance query as a write", () => {
    const line = actionSummary({
      intent: "balance",
      name: "Sita Devi",
      phone: "9000022222",
      balanceAfter: 280,
    });
    expect(line).toContain("Kuch likha nahi jayega");
    expect(line).toContain("9000022222");
  });
});
