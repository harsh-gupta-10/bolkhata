import { describe, expect, it } from "vitest";
import { emptyExtraction, prepareFromExtraction, prepareTurn } from "@/lib/understand";

const ramesh = [{ id: "1", name: "Ramesh Kumar" }];

describe("OpenAI draft mapping", () => {
  it("turns a messy Hinglish extraction into an udhaar draft without writing", () => {
    const turn = prepareFromExtraction(
      "bhai ramesh ko atta ka udhaar laga do do sau pachaas",
      emptyExtraction({
        intent: "udhaar",
        name: "Ramesh",
        phone: "90000 11111",
        amount: 250,
        note: "atta",
      }),
    );
    expect(turn).toMatchObject({
      ok: true,
      source: "openai",
      mode: "action",
      intent: "udhaar",
      name: "Ramesh",
      phone: "90000 11111",
      amount: 250,
      note: "atta",
    });
    expect(turn && "saved" in turn).toBe(false);
  });

  it("keeps a plain question as a reply", () => {
    const turn = prepareFromExtraction(
      "kiraya kitna bacha hai",
      emptyExtraction({ intent: "reply", reply: "Kiraya due 15000 rupay hai." }),
    );
    expect(turn).toMatchObject({ ok: true, mode: "reply", reply: "Kiraya due 15000 rupay hai." });
  });

  it("reads rent and a bill from the model", () => {
    expect(
      prepareFromExtraction("shop rent", emptyExtraction({ intent: "rent", amount: 15000, status: "due", party: "Sharma", period: "November 2026" })),
    ).toMatchObject({ intent: "rent", amount: 15000, party: "Sharma", label: "Kiraya" });
    expect(
      prepareFromExtraction("light bill", emptyExtraction({ intent: "bill", amount: 1450, billKind: "bijli", status: "paid" })),
    ).toMatchObject({ intent: "bill", amount: 1450, billKind: "bijli", status: "paid", label: "Bijli" });
  });
});

describe("parser fallback", () => {
  it("uses the parser when OpenAI is not called", async () => {
    const turn = await prepareTurn({ text: "bijli ka bill 1450", customers: [], extract: null });
    expect(turn).toMatchObject({ ok: true, source: "parser", mode: "action", intent: "bill", amount: 1450 });
  });

  it("uses the parser when the model times out", async () => {
    const turn = await prepareTurn({
      text: "Ramesh ko 250 rupay udhaar, atta 5 kilo",
      customers: ramesh,
      extract: async () => {
        throw new Error("timeout");
      },
    });
    expect(turn).toMatchObject({ ok: true, source: "parser", intent: "udhaar", amount: 250, note: "atta 5 kilo" });
  });

  it("uses the parser when the model is unsure", async () => {
    const turn = await prepareTurn({
      text: "Ramesh ne 500 rupay de diye",
      customers: ramesh,
      extract: async () => emptyExtraction({ intent: "unknown" }),
    });
    expect(turn).toMatchObject({ source: "parser", intent: "payment", amount: 500 });
  });

  it("uses the parser when a money extraction has no amount", async () => {
    const turn = await prepareTurn({
      text: "Ramesh ko 250 rupay udhaar, atta 5 kilo",
      customers: ramesh,
      extract: async () => emptyExtraction({ intent: "udhaar", name: "Ramesh" }),
    });
    expect(turn).toMatchObject({ source: "parser", amount: 250 });
  });
});
