"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Package, Plus, Search, Tag, Truck } from "lucide-react";
import { formatPhone, formatRupees, formatWhen } from "@/lib/format";
import { wholeRupees } from "@/lib/money";
import type { SupplierPurchaseRow } from "@/lib/repo";
import { useShop } from "@/components/shop-provider";
import { Badge, Modal, PageHeader, SampleTag } from "@/components/ui-bits";

export function SupplierView() {
  const shop = useShop();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<SupplierPurchaseRow | null>(null);

  const purchases = shop.data.purchases || [];

  // Summary KPIs
  const totalPurchases = useMemo(
    () => purchases.reduce((sum, p) => sum + Number(p.amount), 0),
    [purchases],
  );
  const paidTotal = useMemo(
    () => purchases.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount), 0),
    [purchases],
  );
  const pendingTotal = useMemo(
    () => purchases.filter((p) => p.status === "pending").reduce((sum, p) => sum + Number(p.amount), 0),
    [purchases],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.supplier_name.toLowerCase().includes(q) ||
        (p.items_text ?? "").toLowerCase().includes(q) ||
        (p.supplier_phone ?? "").includes(q) ||
        (p.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [purchases, search, statusFilter]);

  async function toggleStatus(p: SupplierPurchaseRow) {
    const nextStatus = p.status === "paid" ? "pending" : "paid";
    await fetch(`/api/suppliers/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await shop.reload();
  }

  return (
    <main className="h-full overflow-y-auto bg-[#f6f6f7]">
      <div className="border-b border-border bg-white px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-[#8d5a2b]" />
            <span className="text-sm font-semibold">{shop.text("suppliers_title")}</span>
          </div>
          <a
            href="/api/export?book=suppliers"
            download
            className="btn btn-secondary h-8 items-center gap-1.5 text-xs"
          >
            <Download size={13} /> {shop.text("export_csv")}
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <PageHeader
          title={shop.text("suppliers_title")}
          subtitle="Supplier se khareeda gaya maal aur unka baaki payment hisaab."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} /> {shop.text("add_purchase")}
            </button>
          }
        />

        {/* KPI Cards */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">Kul Maal (Purchases)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#1a1c1e]">{formatRupees(totalPurchases)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">Chuka Diya (Paid)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#1f6b45]">{formatRupees(paidTotal)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">Supplier Baaki (Pending)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#8f3d32]">{formatRupees(pendingTotal)}</p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            className="field w-full sm:w-64"
            placeholder="Supplier ya saaman dhoondo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1">
            {(["all", "pending", "paid"] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  statusFilter === st ? "bg-[#1a1c1e] text-white" : "text-[#616161] hover:bg-white"
                }`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "all" ? shop.text("all") : st === "paid" ? shop.text("paid") : shop.text("due")}
              </button>
            ))}
          </div>
        </div>

        {/* Purchases List */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-10 text-center">
            <Package className="mx-auto text-[#616161]" size={36} />
            <p className="mt-3 text-base font-semibold text-[#1a1c1e]">Abhi koi supplier purchase nahi hai</p>
            <p className="mt-1 text-sm text-[#616161]">Atta, cheeni, tel jaisa dukan ka maal likho aur rate yaad rakho.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={16} /> {shop.text("add_purchase")}
              </button>
              <button
                type="button"
                className="btn btn-secondary font-medium"
                onClick={async () => {
                  await fetch("/api/sample", { method: "POST" });
                  await shop.reload();
                }}
              >
                ✨ {shop.text("load_dummy_data")}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-base text-[#1a1c1e]">{p.supplier_name}</h3>
                        {Boolean(p.is_sample) ? <SampleTag /> : null}
                      </div>
                      {p.supplier_phone ? (
                        <p className="text-xs text-[#616161]">{formatPhone(p.supplier_phone)}</p>
                      ) : null}
                    </div>
                    <span className="text-right">
                      <span className="block text-base font-bold tabular-nums text-[#1a1c1e]">
                        {formatRupees(p.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(p)}
                        className="mt-1 inline-block"
                        title="Click to toggle status"
                      >
                        <Badge tone={p.status === "paid" ? "paid" : "due"}>
                          {p.status === "paid" ? "Paid" : "Pending"}
                        </Badge>
                      </button>
                    </span>
                  </div>

                  <div className="mt-2.5 rounded-lg bg-[#f8f9fa] p-2.5 text-xs">
                    <p className="font-medium text-[#1a1c1e]">{p.items_text}</p>
                    {p.note ? <p className="mt-1 text-[#616161]">{p.note}</p> : null}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs text-[#616161]">
                  <span>{formatWhen(p.created_at)}</span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#8d5a2b] hover:underline"
                    onClick={() => toggleStatus(p)}
                  >
                    Mark as {p.status === "paid" ? "Pending" : "Paid"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal ? (
        <AddPurchaseModal
          purchases={purchases}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => {
            setShowAddModal(false);
            await shop.reload();
          }}
        />
      ) : null}
    </main>
  );
}

function AddPurchaseModal({
  purchases,
  onClose,
  onSaved,
}: {
  purchases: SupplierPurchaseRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const shop = useShop();
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"paid" | "pending">("pending");
  const [note, setNote] = useState("");
  const [itemHint, setItemHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced item price check
  useEffect(() => {
    const q = itemsText.trim();
    if (q.length < 2) {
      setItemHint(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suppliers/check-item?item=${encodeURIComponent(q)}`);
        if (res.ok) {
          const body = (await res.json()) as { found: boolean; purchase?: { supplier_name: string; amount: number; created_at: string } };
          if (body.found && body.purchase) {
            setItemHint(
              `Pichli baar ${body.purchase.supplier_name} se ₹${body.purchase.amount} mein khareeda tha (${body.purchase.created_at.slice(0, 10)}).`,
            );
          } else {
            setItemHint(null);
          }
        }
      } catch {
        setItemHint(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [itemsText]);

  async function handleSave() {
    if (!supplierName.trim()) {
      setError("Supplier ka naam likho.");
      return;
    }
    if (!itemsText.trim()) {
      setError("Saaman / items likho.");
      return;
    }
    const amt = wholeRupees(amount);
    if (!amt || amt <= 0) {
      setError("Sahi amount likho.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName: supplierName.trim(),
          supplierPhone: supplierPhone.trim() || undefined,
          itemsText: itemsText.trim(),
          amount: amt,
          status,
          note: note.trim() || undefined,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Save nahi hua.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={shop.text("add_purchase")} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("supplier_name")} *
            <input
              className="field mt-1"
              placeholder="e.g. Gupta Wholesale"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </label>
          <label className="lbl">
            {shop.text("supplier_phone")}
            <input
              className="field mt-1"
              inputMode="numeric"
              placeholder="90000 44444"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
            />
          </label>
        </div>

        <label className="lbl">
          {shop.text("items_bought")} *
          <input
            className="field mt-1"
            placeholder="e.g. Atta 10 katta, refined oil 2 peti"
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
          />
        </label>

        {/* Rate intelligence hint */}
        {itemHint ? (
          <div className="rounded-lg border border-[#3b82f6]/30 bg-[#eff6ff] p-2.5 text-xs text-[#1e40af]">
            <p className="font-medium">💡 Pichli khareed info:</p>
            <p className="mt-0.5">{itemHint}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("amount")} *
            <input
              className="field mt-1"
              inputMode="numeric"
              placeholder="₹0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="lbl">
            {shop.text("status")}
            <select
              className="field mt-1"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="pending">Pending (Baaki)</option>
              <option value="paid">Paid (Chuka diya)</option>
            </select>
          </label>
        </div>

        <label className="lbl">
          {shop.text("note")}
          <input
            className="field mt-1"
            placeholder="Bill number, batch etc."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "…" : shop.text("save")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {shop.text("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
