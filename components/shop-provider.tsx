"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { peopleWriteReady, projectBalance } from "@/lib/confirm";
import { formatPhone, formatRupees, isoFromIstLocal, istNowLocal } from "@/lib/format";
import { wholeRupees } from "@/lib/money";
import { normalizeLocale, tx, type CopyKey, type Locale } from "@/lib/i18n";
import { prepareTurn, type PreparedTurn } from "@/lib/understand";
import type { CustomerRow } from "@/lib/repo";
import { useTimbre } from "@/components/timbre-player";
import { useBooks, type BooksPayload } from "@/components/use-books";
import { ShopShell } from "@/components/shop-shell";
import { DraftPanel } from "@/components/draft-panel";

export type WorkIntent =
  | "udhaar"
  | "payment"
  | "balance"
  | "rent"
  | "bill"
  | "add_customer"
  | "rent_received"
  | "start_rental"
  | "return_rental"
  | "supplier_purchase";

export interface PersonOption {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  creditLimit?: number | null;
}

export interface Draft {
  intent: WorkIntent;
  source: string;
  name: string;
  phone: string;
  customerId: string;
  people: PersonOption[];
  kind: "one" | "many" | "none";
  amount: string;
  note: string;
  status: "due" | "paid";
  billKind: "bijli" | "paani" | "other";
  party: string;
  period: string;
  label: string;
  when: string;
  assetId?: string;
  assetQuery?: string;
  agreementId?: string;
  ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
  deposit?: string;
  dueDate?: string;
  paymentMode?: "cash" | "UPI" | "other";
  supplierName?: string;
  itemsText?: string;
  days?: number;
  rate?: number;
}

export interface ThreadTurn {
  id: string;
  role: "user" | "shop";
  text: string;
  at: string;
}

interface ToastState {
  message: string;
  entryId?: string;
  recordId?: string;
  customerId?: string;
  rentalPaymentId?: string;
  supplierPurchaseId?: string;
}

interface ShopApi {
  data: BooksPayload;
  reload: () => Promise<void>;
  error: string | null;
  setError: (value: string | null) => void;
  thread: ThreadTurn[];
  draft: Draft | null;
  openDraft: (draft: Draft) => void;
  patchDraft: (partial: Partial<Draft>) => void;
  dismissDraft: () => void;
  confirmDraft: () => Promise<void>;
  lookupDraft: (name: string) => Promise<void>;
  speak: (text: string) => Promise<void>;
  locale: Locale;
  text: (key: CopyKey) => string;
  setLocale: (locale: Locale) => Promise<void>;
  saving: boolean;
  toast: ToastState | null;
  undoToast: () => Promise<void>;
}

const ShopContext = createContext<ShopApi | null>(null);

export function useShop(): ShopApi {
  const value = useContext(ShopContext);
  if (!value) throw new Error("useShop outside the shop");
  return value;
}

export function blankDraft(intent: WorkIntent, source = ""): Draft {
  return {
    intent,
    source,
    name: "",
    phone: "",
    customerId: "",
    people: [],
    kind: "none",
    amount: "",
    note: "",
    status: intent === "payment" || intent === "rent_received" ? "paid" : "due",
    billKind: "other",
    party: "",
    period: "",
    label:
      intent === "rent"
        ? "Kiraya Diya"
        : intent === "rent_received"
          ? "Kiraya Mila"
          : intent === "start_rental"
            ? "Kiraye Par Diya"
            : intent === "return_rental"
              ? "Kiraya Wapsi"
              : intent === "supplier_purchase"
                ? "Supplier Maal"
                : intent === "bill"
                  ? "Bill"
                  : "",
    when: istNowLocal(),
    ratePeriod: "per_day",
    paymentMode: "cash",
  };
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const books = useBooks();
  const voice = useTimbre();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [thread, setThread] = useState<ThreadTurn[]>([]);
  const [threadShop, setThreadShop] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const shopId = books.data?.shop.id;

  if (shopId && shopId !== threadShop && books.data) {
    setThreadShop(shopId);
    setThread(books.data.messages.map((message) => ({ id: message.id, role: message.role, text: message.text, at: message.created_at })));
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (books.loading || !books.data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="h-8 w-40 rounded bg-white" />
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-xl border border-border bg-white" />
          ))}
        </div>
        <p className="mt-6 text-sm text-[#616161]">{books.error || tx(normalizeLocale(memoryShopLocale(books.data)), "loading")}</p>
      </main>
    );
  }

  const data = books.data;

  const locale = normalizeLocale(data.shop.locale);
  const textOf = (key: CopyKey) => tx(locale, key);

  function push(role: ThreadTurn["role"], text: string) {
    setThread((current) => [...current, { id: crypto.randomUUID(), role, text, at: new Date().toISOString() }]);
    void fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, text }),
    });
  }

  async function setLocale(next: Locale) {
    books.patchShop({ locale: next });
    await fetch("/api/shop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next, name: data.shop.name, ownerName: data.shop.owner_name, phone: data.shop.phone ?? "" }),
    });
  }

  async function lookupDraft(name: string) {
    const response = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const resolved = (await response.json()) as { kind: Draft["kind"]; people: PersonOption[] };
    setDraft((current) => {
      if (!current) return current;
      const only = resolved.kind === "one" ? resolved.people[0] : undefined;
      return {
        ...current,
        kind: resolved.kind,
        people: resolved.people ?? [],
        customerId: only?.id ?? "",
        name: only?.name ?? current.name,
        phone: only?.phone || current.phone,
      };
    });
  }

  async function speak(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    push("user", trimmed);
    let prepared: PreparedTurn | null = null;
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
        signal: AbortSignal.timeout(12_000),
      });
      if (response.ok) prepared = (await response.json()) as PreparedTurn;
    } catch {
      prepared = null;
    }
    if (!prepared) {
      prepared = await prepareTurn({
        text: trimmed,
        customers: data.customers.map((customer) => ({ id: customer.id, name: customer.name })),
        extract: null,
      });
    }
    if (!prepared.ok) {
      push("shop", textOf("chat_miss"));
      books.setError(null);
      return;
    }
    if (prepared.mode === "reply") {
      push("shop", prepared.reply);
      books.setError(null);
      return;
    }
    const next = blankDraft(prepared.intent, trimmed);
    next.name = prepared.name;
    next.phone = prepared.phone;
    next.amount = prepared.amount ? String(prepared.amount) : "";
    next.note = prepared.note;
    next.status = prepared.status;
    next.billKind = prepared.billKind;
    next.label = prepared.label || next.label;
    next.party = prepared.party;
    next.period = prepared.period;
    next.assetQuery = prepared.assetQuery;
    next.days = prepared.days;
    next.rate = prepared.rate;
    next.ratePeriod = prepared.ratePeriod || next.ratePeriod;

    // Smart matching for rental asset
    if (prepared.assetQuery && data.assets && data.assets.length > 0) {
      const q = prepared.assetQuery.toLowerCase();
      const matched = data.assets.find((a) => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()));
      if (matched) {
        next.assetId = matched.id;
        if (!next.amount && matched.rate) next.amount = String(matched.rate);
        if (matched.rate_period) next.ratePeriod = matched.rate_period;
        if (matched.security_deposit) next.deposit = String(matched.security_deposit);
      }
    }

    // Smart matching for agreement on return_rental or rent_received
    if ((prepared.intent === "return_rental" || prepared.intent === "rent_received") && data.agreements) {
      const active = data.agreements.find((ag) => {
        if (ag.status === "ended") return false;
        if (next.assetId && ag.asset_id === next.assetId) return true;
        return false;
      });
      if (active) {
        next.agreementId = active.id;
        next.assetId = active.asset_id;
        next.customerId = active.customer_id;
        const tenant = data.customers.find((c) => c.id === active.customer_id);
        if (tenant) {
          next.name = tenant.name;
          next.phone = tenant.phone ?? "";
        }
      }
    }

    if (prepared.date && utteranceHasDate(trimmed)) next.when = `${prepared.date}T12:00`;
    setDraft(next);
    if (
      prepared.name &&
      (prepared.intent === "udhaar" ||
        prepared.intent === "payment" ||
        prepared.intent === "balance" ||
        prepared.intent === "add_customer" ||
        prepared.intent === "rent_received" ||
        prepared.intent === "start_rental")
    ) {
      await lookupInto(prepared.name);
    }
    books.setError(null);
  }

  async function lookupInto(name: string) {
    const response = await fetch("/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const resolved = (await response.json()) as { kind: Draft["kind"]; people: PersonOption[] };
    setDraft((current) => {
      if (!current) return current;
      const only = resolved.kind === "one" ? resolved.people[0] : undefined;
      return {
        ...current,
        kind: resolved.kind,
        people: resolved.people ?? [],
        customerId: only?.id ?? "",
        name: only?.name ?? current.name,
        phone: only?.phone || current.phone,
      };
    });
  }

  async function confirmDraft() {
    if (!draft) return;
    setSaving(true);
    books.setError(null);
    try {
      if (draft.intent === "balance") {
        const person = chosenPerson(draft, data.customers);
        push("shop", person ? `${person.name} (${formatPhone(person.phone ?? undefined) ?? "phone nahi"}) ka baaki ${formatRupees(Number(person.balance) || 0)} hai.` : "Koi aisa grahak nahi mila.");
        setDraft(null);
        return;
      }
      if (draft.intent === "add_customer" && draft.customerId) {
        push("shop", `${draft.name} pehle se khate mein hai.`);
        setDraft(null);
        return;
      }
      const response = await commit(draft, data);
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        entryId?: string;
        recordId?: string;
        customerId?: string;
        createdCustomerId?: string;
        balance?: number;
        rentalPaymentId?: string;
        supplierPurchaseId?: string;
      };
      if (!response.ok) {
        books.setError(body.error || "Likha nahi gaya.");
        return;
      }
      const message = savedLine(draft, body.balance, locale, data);
      push("shop", message);
      setToast({
        message,
        entryId: body.entryId,
        recordId: body.recordId,
        customerId: body.createdCustomerId,
        rentalPaymentId: body.rentalPaymentId,
        supplierPurchaseId: body.supplierPurchaseId,
      });
      void voice.play(message);
      setDraft(null);
      await books.reload();
    } finally {
      setSaving(false);
    }
  }

  async function undoToast() {
    if (!toast) return;
    const response = await fetch("/api/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId: toast.entryId,
        recordId: toast.recordId,
        customerId: toast.customerId,
        rentalPaymentId: toast.rentalPaymentId,
        supplierPurchaseId: toast.supplierPurchaseId,
      }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      books.setError(body.error || "Undo nahi hua.");
      return;
    }
    push("shop", "Wapas hata diya.");
    setToast(null);
    await books.reload();
  }

  const api: ShopApi = {
    data,
    reload: books.reload,
    error: books.error,
    setError: books.setError,
    thread,
    draft,
    openDraft: setDraft,
    patchDraft: (partial) => setDraft((current) => (current ? { ...current, ...partial } : current)),
    dismissDraft: () => {
      if (draft && draft.source !== "manual" && draft.source !== "contacts") {
        push("shop", "Chhod diya. Kuch nahi likha.");
      }
      setDraft(null);
    },
    confirmDraft,
    lookupDraft,
    speak,
    locale,
    text: textOf,
    setLocale,
    saving,
    toast,
    undoToast,
  };

  return (
    <ShopContext.Provider value={api}>
      <ShopShell>{children}</ShopShell>
      <DraftPanel />
      {toast ? (
        <>
        <div className="fixed bottom-28 left-1/2 z-50 flex w-[min(92vw,28rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-[#1a1c1e] px-4 py-3 text-sm text-white shadow-lg">
          <span>{toast.message}</span>
          <span className="flex shrink-0 gap-3">
            <button type="button" className="font-semibold text-[#f3efe6] underline" onClick={() => void undoToast()}>
              {textOf("undo")}
            </button>
            {voice.state === "playing" || voice.state === "loading" ? (
              <button type="button" className="font-semibold" onClick={voice.stop}>{voice.state === "loading" ? "…" : "Stop"}</button>
            ) : null}
            {voice.state === "error" ? (
              <button type="button" className="font-semibold" onClick={() => void voice.retry()}>Retry</button>
            ) : null}
          </span>
        </div>
        {voice.error ? <p className="fixed bottom-44 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-lg bg-[#8f3d32] px-3 py-2 text-sm text-white">{voice.error}</p> : null}
        </>
      ) : null}
    </ShopContext.Provider>
  );
}

function shiftDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function commit(draft: Draft, data: BooksPayload): Promise<Response> {
  const createdAt = isoFromIstLocal(draft.when);
  const amount = wholeRupees(draft.amount);

  if (draft.intent === "rent_received") {
    return fetch("/api/rentals/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agreementId: draft.agreementId,
        customerId: draft.customerId || undefined,
        assetId: draft.assetId || undefined,
        amount,
        paymentDate: draft.when ? isoFromIstLocal(draft.when).slice(0, 10) : undefined,
        mode: draft.paymentMode || "cash",
        note: draft.note,
        confirmed: true,
      }),
    });
  }

  if (draft.intent === "start_rental") {
    return fetch("/api/rentals/agreements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: draft.assetId,
        customerId: draft.customerId || undefined,
        name: draft.name,
        phone: draft.phone,
        startDate: draft.when ? isoFromIstLocal(draft.when).slice(0, 10) : undefined,
        expectedEndDate:
          draft.dueDate ||
          (draft.days
            ? shiftDays(draft.when ? isoFromIstLocal(draft.when).slice(0, 10) : new Date().toISOString().slice(0, 10), draft.days)
            : undefined),
        rateAmount: Number(draft.amount || draft.rate || 0),
        ratePeriod: draft.ratePeriod || "per_day",
        depositAmount: Number(draft.deposit || 0),
        dueDay: 1,
        note: draft.note,
        confirmed: true,
      }),
    });
  }

  if (draft.intent === "return_rental") {
    const agreementId =
      draft.agreementId || data.agreements?.find((ag) => ag.asset_id === draft.assetId && ag.status !== "ended")?.id;
    return fetch(`/api/rentals/agreements/${agreementId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        returnDate: draft.when ? isoFromIstLocal(draft.when).slice(0, 10) : undefined,
        deductions: Number(draft.deposit || 0),
        deductionReason: draft.note,
        confirmed: true,
      }),
    });
  }

  if (draft.intent === "supplier_purchase") {
    return fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierName: draft.supplierName || draft.name,
        supplierPhone: draft.phone,
        itemsText: draft.itemsText || draft.note,
        amount,
        status: draft.status,
        note: draft.note,
        confirmed: true,
      }),
    });
  }

  if (draft.intent === "add_customer") {
    return fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.name, phone: draft.phone }),
    });
  }
  if (draft.intent === "rent" || draft.intent === "bill") {
    return fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: draft.intent,
        status: draft.status,
        amount,
        label: draft.label || (draft.intent === "rent" ? "Kiraya" : "Bill"),
        billKind: draft.billKind,
        party: draft.party,
        period: draft.period,
        note: draft.note,
        transcript: draft.source,
        confirmed: true,
        createdAt,
      }),
    });
  }
  return fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: draft.intent,
      amount,
      note: draft.note,
      transcript: draft.source,
      customerId: draft.customerId || undefined,
      phone: draft.phone,
      name: draft.name,
      dueDate: draft.dueDate,
      confirmed: true,
      create: draft.customerId ? undefined : { name: draft.name, phone: draft.phone },
      createdAt,
    }),
  });
}

function chosenPerson(draft: Draft, customers: CustomerRow[]): CustomerRow | undefined {
  return customers.find((customer) => customer.id === draft.customerId) ?? draft.people.find((person) => person.id === draft.customerId) as CustomerRow | undefined;
}

function savedLine(draft: Draft, balance: number | undefined, locale: Locale, data?: BooksPayload): string {
  const who = `${draft.name} (${formatPhone(draft.phone) ?? draft.phone})`;
  const money = formatRupees(wholeRupees(draft.amount) ?? 0);
  const after = balance == null ? "" : locale === "en" ? ` Balance ${formatRupees(balance)}.` : ` Baaki ${formatRupees(balance)}.`;
  const assetName = data?.assets?.find((a) => a.id === draft.assetId)?.name || draft.assetQuery || "Asset";

  if (locale === "en") {
    if (draft.intent === "rent_received") return `Rent ${money} received from ${who}.`;
    if (draft.intent === "start_rental") return `${assetName} rented out to ${who}.`;
    if (draft.intent === "return_rental") return `${assetName} returned.`;
    if (draft.intent === "supplier_purchase") return `Supplier purchase ${money} saved.`;
    if (draft.intent === "add_customer") return `${who} is on the book.`;
    if (draft.intent === "rent" || draft.intent === "bill") return `${draft.label || draft.intent} ${money} saved.`;
    return `${who}: ${money} ${draft.intent === "udhaar" ? "credit" : "payment"} saved.${after}`;
  }
  if (draft.intent === "rent_received") return `${who} se ${money} kiraya jama kiya.`;
  if (draft.intent === "start_rental") return `${assetName} ${who} ko kiraye par de diya.`;
  if (draft.intent === "return_rental") return `${assetName} wapas le liya.`;
  if (draft.intent === "supplier_purchase") return `Supplier purchase ${money} likh diya.`;
  if (draft.intent === "add_customer") return `${who} ka khata khul gaya.`;
  if (draft.intent === "rent" || draft.intent === "bill") return `${draft.label || draft.intent} ${money} likh diya.`;
  return `${who} · ${money} ${draft.intent === "udhaar" ? "udhaar" : "jama"} likh diya.${after}`;
}

function utteranceHasDate(text: string): boolean {
  return /(\baaj\b|आज|\bkal\b|कल|\bparso\b|\d{1,2}\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|नवंबर))/i.test(text);
}

export function draftGate(draft: Draft) {
  const amount = wholeRupees(draft.amount) ?? 0;
  if (draft.intent === "rent" || draft.intent === "bill") {
    return amount > 0 ? { ok: true, reason: "", balanceAfter: null } : { ok: false, reason: "", balanceAfter: null };
  }
  if (draft.intent === "supplier_purchase") {
    const hasName = Boolean((draft.supplierName || draft.name).trim());
    return amount > 0 && hasName ? { ok: true, reason: "", balanceAfter: null } : { ok: false, reason: "Supplier naam aur amount likho.", balanceAfter: null };
  }
  if (draft.intent === "return_rental") {
    return draft.assetId || draft.agreementId ? { ok: true, reason: "", balanceAfter: null } : { ok: false, reason: "Asset chuno.", balanceAfter: null };
  }
  if (draft.intent === "start_rental") {
    const ready = peopleWriteReady({
      intent: "udhaar",
      name: draft.name,
      phone: draft.phone,
      amount: amount || 1,
      ambiguous: draft.kind === "many" && !draft.customerId,
      personChosen: Boolean(draft.customerId) || draft.kind === "none",
    });
    if (!draft.assetId) return { ok: false, reason: "Rental asset chuno.", balanceAfter: null };
    if (!ready.ok) return { ...ready, balanceAfter: null };
    return { ok: true, reason: "", balanceAfter: null };
  }
  if (draft.intent === "rent_received") {
    const ready = peopleWriteReady({
      intent: "payment",
      name: draft.name,
      phone: draft.phone,
      amount,
      ambiguous: draft.kind === "many" && !draft.customerId,
      personChosen: Boolean(draft.customerId) || draft.kind === "none",
    });
    return { ...ready, balanceAfter: null };
  }
  if (draft.intent === "balance") {
    return draft.customerId ? { ok: true, reason: "", balanceAfter: null } : { ok: false, reason: "Pehle insaan chuno.", balanceAfter: null };
  }
  const person = draft.people.find((item) => item.id === draft.customerId);
  const next = person && (draft.intent === "udhaar" || draft.intent === "payment") ? projectBalance(Number(person.balance) || 0, draft.intent, amount || 0) : null;
  return {
    ...peopleWriteReady({
      intent: draft.intent,
      name: draft.name,
      phone: draft.phone,
      amount,
      ambiguous: draft.kind === "many" && !draft.customerId,
      personChosen: Boolean(draft.customerId) || draft.kind === "none",
    }),
    balanceAfter: next,
  };
}

function memoryShopLocale(data: { shop: { locale: string | null } } | null): string | null {
  return data?.shop.locale ?? null;
}
