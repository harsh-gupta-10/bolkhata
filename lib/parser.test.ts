import { describe, expect, it } from "vitest";
import { applyInterpret } from "@/lib/apply";
import { demoLedger } from "@/lib/demo-data";
import { outstandingTotal } from "@/lib/ledger";
import { matchCustomers } from "@/lib/match";
import { interpret } from "@/lib/parser";
import { phonetic, toSpokenRupees, UNDER_HUNDRED } from "@/lib/hindi";
import { udhaarSpeech } from "@/lib/speech";
import { emptyLedger, type Ledger } from "@/lib/types";

const shop = [
  { id: "1", name: "Ramesh Kumar" },
  { id: "2", name: "Sita Devi" },
  { id: "3", name: "Imran Sheikh" },
];

const twoRamesh = [
  { id: "1", name: "Ramesh Kumar" },
  { id: "4", name: "Ramesh Yadav" },
  { id: "2", name: "Sita Devi" },
];

describe("spoken rupees", () => {
  it("uses the challenge wording for 250 and 500", () => {
    expect(UNDER_HUNDRED).toHaveLength(100);
    expect(UNDER_HUNDRED[50]).toBe("pachaas");
    expect(toSpokenRupees(250)).toBe("do sau pachaas rupay");
    expect(toSpokenRupees(500)).toBe("paanch sau rupay");
    expect(toSpokenRupees(0)).toBe("shunya rupay");
    expect(toSpokenRupees(15)).toBe("pandrah rupay");
    expect(toSpokenRupees(101)).toBe("ek sau ek rupay");
    expect(toSpokenRupees(1000)).toBe("ek hazaar rupay");
    expect(toSpokenRupees(1250)).toBe("ek hazaar do sau pachaas rupay");
    expect(toSpokenRupees(100000)).toBe("ek lakh rupay");
    expect(toSpokenRupees(-250)).toBe("minus do sau pachaas rupay");
  });
});

describe("customer match", () => {
  it("folds case, Devanagari, and unique first names", () => {
    expect(phonetic("रमेश कुमार")).toBe("ramesh kumar");
    expect(phonetic("सीता देवी")).toBe("sita devi");
    expect(phonetic("इमरान शेख")).toBe("imran shekh");
    expect(phonetic("Imran Sheikh")).toBe("imran shekh");

    expect(matchCustomers("RAMESH KUMAR", shop)).toEqual({ status: "one", customer: shop[0] });
    expect(matchCustomers("ramesh", shop).status).toBe("one");
    expect(matchCustomers("रमेश", shop).status).toBe("one");
    expect(matchCustomers("सीता", shop).status).toBe("one");
    expect(matchCustomers("इमरान शेख", shop).status).toBe("one");
    expect(matchCustomers("Kumar", shop).status).toBe("none");
  });

  it("returns every Ramesh when the first name is shared", () => {
    const match = matchCustomers("Ramesh", twoRamesh);
    expect(match.status).toBe("many");
    if (match.status === "many") {
      expect(match.customers.map((customer) => customer.name)).toEqual(["Ramesh Kumar", "Ramesh Yadav"]);
    }
    expect(matchCustomers("Ramesh Yadav", twoRamesh).status).toBe("one");
  });
});

describe("hinglish parser", () => {
  it("parses the four core lines", () => {
    const udhaar = interpret("Ramesh ko 250 rupay udhaar, atta 5 kilo", shop);
    expect(udhaar).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      note: "atta 5 kilo",
    });
    if (udhaar.ok && udhaar.intent === "udhaar") {
      expect(udhaar.match).toEqual({ status: "one", customer: shop[0] });
    }

    const payment = interpret("Ramesh ne 500 rupay de diye", shop);
    expect(payment).toMatchObject({ ok: true, intent: "payment", amount: 500, note: undefined });

    const balance = interpret("Ramesh ka balance kitna hai?", shop);
    expect(balance).toMatchObject({ ok: true, intent: "balance" });
    if (balance.ok && balance.intent === "balance") {
      expect(balance.match.status).toBe("one");
    }

    const added = interpret("Add Ramesh Kumar, 98765 43210");
    expect(added).toMatchObject({
      ok: true,
      intent: "add_customer",
      name: "Ramesh Kumar",
      phone: "9876543210",
    });
  });

  it("accepts Devanagari, symbols, and Indian grouping", () => {
    expect(interpret("रमेश को ₹250 उधार atta 5 kilo", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      note: "atta 5 kilo",
    });
    expect(interpret("रमेश को २५० रुपये उधार", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
    });
    expect(interpret("सीता ने 200 रुपये जमा कर दिए", shop)).toMatchObject({
      ok: true,
      intent: "payment",
      amount: 200,
    });
    expect(interpret("Imran ka baaki kitna hai", shop)).toMatchObject({ ok: true, intent: "balance" });
    expect(interpret("Rs 1,25,000 udhaar Ramesh ko", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 125000,
    });
    expect(interpret("Rs. 250 udhar Sita ko cheeni", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      note: "cheeni",
    });
    expect(interpret("Ramesh ko do sau pachaas rupay udhaar atta 5 kilo", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      note: "atta 5 kilo",
    });
    expect(interpret("500 jama Ramesh", shop)).toMatchObject({ ok: true, intent: "payment", amount: 500 });
    expect(interpret("Imran se 150 vasool", shop)).toMatchObject({ ok: true, intent: "payment", amount: 150 });
    expect(interpret("Sita ko 80 rupay udhar cheeni", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 80,
      note: "cheeni",
    });
  });

  it("opens a khata from Latin or Devanagari", () => {
    expect(interpret("naya grahak Geeta Ben, 90000 44444")).toMatchObject({
      ok: true,
      intent: "add_customer",
      name: "Geeta Ben",
      phone: "9000044444",
    });
    expect(interpret("नया ग्राहक इमरान")).toMatchObject({
      ok: true,
      intent: "add_customer",
      name: "इमरान",
    });
    expect(interpret("Add Ramesh Kumar, 90000 11111")).toMatchObject({
      phone: "9000011111",
      name: "Ramesh Kumar",
    });
  });

  it("reads shop rent and utility bills without stealing a customer's payment", () => {
    expect(interpret("dukaan ka kiraya 15000 dena hai")).toMatchObject({
      ok: true,
      intent: "rent",
      amount: 15000,
      status: "due",
      label: "Kiraya",
    });
    expect(interpret("kiraya 8000 de diye")).toMatchObject({
      ok: true,
      intent: "rent",
      amount: 8000,
      status: "paid",
    });
    expect(interpret("bijli ka bill 1450")).toMatchObject({
      ok: true,
      intent: "bill",
      amount: 1450,
      billKind: "bijli",
      status: "due",
    });
    expect(interpret("paani ka bill 300 de diya")).toMatchObject({
      ok: true,
      intent: "bill",
      amount: 300,
      billKind: "paani",
      status: "paid",
    });
    expect(interpret("Ramesh ne 500 rupay de diye", shop)).toMatchObject({ ok: true, intent: "payment", amount: 500 });
  });

  it("asks which Ramesh and returns the raw line when nothing matches a command", () => {
    const ambiguous = interpret("Ramesh ko 40 rupay udhaar", twoRamesh);
    expect(ambiguous.ok).toBe(true);
    if (ambiguous.ok && ambiguous.intent === "udhaar") {
      expect(ambiguous.match.status).toBe("many");
    }
    const raw = "hello yaar kya haal hai";
    expect(interpret(raw, shop)).toEqual({ ok: false, raw });
  });

  it("does not treat a phone suffix as rupees and keeps the item note", () => {
    expect(interpret("Imran Sheikh, phone ending 33333, sau pachas ka udhaar, tel ek litre", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 150,
      customerQuery: "Imran Sheikh",
      note: "tel ek litre",
    });
    expect(interpret("Imran Sheikh sau pachas ka udhaar tel ek litre", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 150,
      customerQuery: "Imran Sheikh",
      note: "tel ek litre",
    });
    expect(interpret("Ramesh 9000011111 ko 250 udhaar", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      phone: "9000011111",
      customerQuery: "Ramesh",
      note: undefined,
    });
    expect(interpret("Ramesh ko 250 rupay udhaar, atta 5 kilo", shop)).toMatchObject({
      ok: true,
      intent: "udhaar",
      amount: 250,
      note: "atta 5 kilo",
    });
  });
});

describe("ledger writes", () => {
  it("keeps a running balance and ignores advance in kul udhaar", () => {
    const ledger = demoLedger();
    expect(ledger.customers.find((customer) => customer.name === "Ramesh Kumar")?.balance).toBe(230);
    expect(outstandingTotal(ledger)).toBe(720);

    let ids = 0;
    const meta = { at: "2026-11-06T12:00:00+05:30", nextId: () => `n${++ids}` };
    const udhaar = interpret("Ramesh ko 250 rupay udhaar, atta 5 kilo", ledger.customers);
    const wrote = applyInterpret(ledger, udhaar, { ...meta, transcript: udhaar.ok ? udhaar.raw : "" });
    expect(wrote.ok).toBe(true);
    if (!wrote.ok) return;
    expect(wrote.speech).toBe(udhaarSpeech("Ramesh Kumar", 250, 480));
    const ramesh = wrote.ledger.customers.find((customer) => customer.id === "demo-ramesh");
    expect(ramesh?.balance).toBe(480);
    expect(ramesh?.entries.at(-1)?.runningBalance).toBe(480);
    expect(ramesh?.entries.at(-1)?.note).toBe("atta 5 kilo");

    const paid = applyInterpret(
      emptyAdvance(),
      interpret("Ramesh ne 500 rupay de diye", emptyAdvance().customers),
      meta,
    );
    expect(paid.ok).toBe(true);
    if (paid.ok) {
      expect(paid.ledger.customers[0]?.balance).toBe(-250);
      expect(outstandingTotal(paid.ledger)).toBe(0);
    }
  });
});

function emptyAdvance(): Ledger {
  return {
    version: 2,
    shop: [],
    messages: [],
    customers: [
      {
        id: "1",
        name: "Ramesh Kumar",
        createdAt: "2026-11-06T10:00:00+05:30",
        phone: "9000011111",
        balance: 250,
        entries: [],
      },
    ],
  };
}

describe("empty book", () => {
  it("still splits the note without a saved customer", () => {
    expect(interpret("Ramesh ko 250 rupay udhaar, atta 5 kilo", emptyLedger().customers)).toMatchObject({
      ok: true,
      intent: "udhaar",
      customerQuery: "Ramesh",
      amount: 250,
      note: "atta 5 kilo",
    });
  });
});

describe("rentals voice and chat parsing", () => {
  it("parses the four required rental queries and commands", () => {
    // 1. Rent received
    const rentReceived = interpret("Sharma ji ne kamre ka 5000 kiraya diya", shop);
    expect(rentReceived).toMatchObject({
      ok: true,
      intent: "rent_received",
      amount: 5000,
      customerQuery: "Sharma",
      assetQuery: "kamre",
    });

    // 2. Start rental
    const startRental = interpret("Chakki Ramesh ko 3 din ke liye di, 200 roz", shop);
    expect(startRental).toMatchObject({
      ok: true,
      intent: "start_rental",
      customerQuery: "Ramesh",
      assetQuery: "Chakki",
      days: 3,
      rate: 200,
      ratePeriod: "per_day",
    });

    // 3. Return rental
    const returnRental = interpret("Ramesh ne chakki wapas kar di", shop);
    expect(returnRental).toMatchObject({
      ok: true,
      intent: "return_rental",
      customerQuery: "Ramesh",
      assetQuery: "chakki",
    });

    // 4. Overdue rent query
    const overdueQuery = interpret("Kiska kiraya baaki hai?", shop);
    expect(overdueQuery).toMatchObject({
      ok: true,
      intent: "rent_overdue_query",
    });
  });
});

