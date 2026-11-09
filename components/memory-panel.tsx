"use client";

import { useState } from "react";
import { formatPhone, formatRupees } from "@/lib/format";
import { useShop } from "@/components/shop-provider";

export function MemoryPanel() {
  const shop = useShop();
  const nodes = shop.data.memory ?? [];
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [intent, setIntent] = useState("note");
  const [amount, setAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function startNew() {
    setEditingId(null);
    setCustomerId("");
    setName("");
    setNote("");
    setIntent("note");
    setAmount("");
    setOpen(true);
  }

  function startEdit(id: string) {
    const node = nodes.find((item) => item.customer_id === id);
    if (!node) return;
    setEditingId(id);
    setCustomerId(id.startsWith("note:") || id.startsWith("record:") ? "" : id);
    setName(node.name);
    setNote(node.user_note ?? node.last_note ?? "");
    setIntent(node.last_intent ?? "note");
    setAmount(node.last_amount ? String(node.last_amount) : "");
    setOpen(true);
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{shop.text("memory_title")}</h2>
          <p className="mt-1 max-w-xl text-sm text-[#616161]">{shop.text("memory_help")}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startNew}>{shop.text("memory_add")}</button>
      </div>
      {nodes.length === 0 ? (
        <p className="rounded-xl border border-border bg-white px-4 py-8 text-sm text-[#616161]">{shop.text("memory_empty")}</p>
      ) : (
        <ul className="divide-y divide-[#f1f2f4] overflow-hidden rounded-xl border border-border bg-white">
          {nodes.map((node) => (
            <li key={node.customer_id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{node.name}</p>
                <p className="text-sm text-[#616161]">{formatPhone(node.phone ?? undefined) ?? "—"} · {node.last_intent || "note"}{node.last_amount ? ` · ${formatRupees(node.last_amount)}` : ""}</p>
                {node.user_note ? <p className="mt-1 text-sm">{node.user_note}</p> : null}
                {node.last_note && node.last_note !== node.user_note ? <p className="mt-1 text-xs text-[#616161]">{node.last_note}</p> : null}
              </div>
              <span className="flex gap-2">
                <button type="button" className="btn btn-secondary h-10" onClick={() => startEdit(node.customer_id)}>Edit</button>
                <button
                  type="button"
                  className="btn btn-secondary h-10"
                  onClick={async () => {
                    await fetch(`/api/memory?customerId=${encodeURIComponent(node.customer_id)}`, { method: "DELETE" });
                    await shop.reload();
                  }}
                >
                  {shop.text("memory_remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form
          className="mt-3 space-y-3 rounded-xl border border-border bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const picked = shop.data.customers.find((customer) => customer.id === customerId);
            await fetch("/api/memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: editingId && !customerId ? editingId : customerId || undefined,
                name: picked?.name || name,
                note,
                intent,
                amount: amount ? Number(amount) : undefined,
              }),
            });
            setOpen(false);
            await shop.reload();
          }}
        >
          <label className="lbl">{shop.text("field_person")}
            <select className="field mt-1" value={customerId} onChange={(event) => {
              setCustomerId(event.target.value);
              const picked = shop.data.customers.find((customer) => customer.id === event.target.value);
              if (picked) setName(picked.name);
            }}>
              <option value="">{shop.text("choose_customer")}</option>
              {shop.data.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} · {formatPhone(customer.phone ?? undefined) ?? "—"}</option>
              ))}
            </select>
          </label>
          {!customerId ? <label className="lbl">{shop.text("field_new_name")}<input className="field mt-1" value={name} required onChange={(event) => setName(event.target.value)} /></label> : null}
          <label className="lbl">{shop.text("intent")}
            <select className="field mt-1" value={intent} onChange={(event) => setIntent(event.target.value)}>
              <option value="note">Note</option>
              <option value="udhaar">{shop.text("nav_udhaar")}</option>
              <option value="payment">{shop.text("nav_jama")}</option>
              <option value="rent">{shop.text("nav_kiraya")}</option>
              <option value="bill">{shop.text("nav_bills")}</option>
            </select>
          </label>
          <label className="lbl">{shop.text("note")}<input className="field mt-1" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <label className="lbl">{shop.text("amount")}<input className="field mt-1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary">{shop.text("memory_save")}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>{shop.text("cancel")}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
