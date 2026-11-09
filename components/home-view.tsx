"use client";

import Link from "next/link";
import { formatPhone, formatRupees, formatWhen } from "@/lib/format";
import { blankDraft, useShop } from "@/components/shop-provider";
import { Badge } from "@/components/ui-bits";

export function HomeView() {
  const shop = useShop();
  const { customers, entries, records, shop: profile } = shop.data;
  const outstanding = customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance) || 0), 0);
  const received = entries.filter((entry) => entry.type === "payment").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const rentDue = records.filter((record) => record.kind === "rent" && record.status === "due").reduce((sum, record) => sum + Number(record.amount), 0);
  const billsDue = records.filter((record) => record.kind === "bill" && record.status === "due").reduce((sum, record) => sum + Number(record.amount), 0);
  const activity = [
    ...entries.map((entry) => ({
      id: entry.id,
      at: entry.created_at,
      title: entry.customer_name,
      meta: `${formatPhone(entry.customer_phone ?? undefined) ?? "phone nahi"} · ${entry.note || (entry.type === "udhaar" ? "Udhaar" : "Jama")}`,
      amount: entry.amount,
      badge: entry.type === "payment" ? "Jama" : "Udhaar",
      tone: entry.type === "payment" ? "paid" as const : "due" as const,
      href: entry.type === "udhaar" ? "/app/udhaar" : "/app/jama",
    })),
    ...records.map((record) => ({
      id: record.id,
      at: record.created_at,
      title: record.label,
      meta: `${record.party || "party nahi"} · ${record.period || record.kind}`,
      amount: record.amount,
      badge: record.status === "paid" ? "Jama" : "Due",
      tone: record.status === "paid" ? "paid" as const : "due" as const,
      href: record.kind === "rent" ? "/app/kiraya" : "/app/bills",
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-[#616161]">{shop.text("home_line")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => shop.openDraft(blankDraft("payment", "manual"))}>
            + {shop.text("add_jama")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft("udhaar", "manual"))}>
            + {shop.text("add_udhaar")}
          </button>
        </div>
      </div>

      {/* Daily Cash Summary (Aaj ka hisaab) */}
      <section className="mb-5 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-[#8d5a2b] uppercase">IST Day Summary</span>
            <h2 className="text-lg font-bold text-[#1a1c1e]">{shop.text("daily_cash_summary")}</h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#616161]">{shop.text("net_cash")}:</span>
            <span
              className={`ml-2 text-xl font-extrabold tabular-nums ${
                (shop.data.dailySummary?.netCash ?? 0) >= 0 ? "text-[#1f6b45]" : "text-[#8f3d32]"
              }`}
            >
              {formatRupees(shop.data.dailySummary?.netCash ?? 0)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-[#e7f5ee]/60 p-3">
            <span className="text-xs font-medium text-[#1f6b45]">{shop.text("cash_in")}</span>
            <p className="mt-1 text-base font-bold tabular-nums text-[#1f6b45]">
              {formatRupees(shop.data.dailySummary?.cashIn ?? 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#616161]">
              Jama: {formatRupees(shop.data.dailySummary?.breakdown.paymentsReceived ?? 0)}
              {(shop.data.dailySummary?.breakdown.rentCollected ?? 0) > 0
                ? ` · Kiraya: ${formatRupees(shop.data.dailySummary?.breakdown.rentCollected ?? 0)}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl bg-[#fdecec]/60 p-3">
            <span className="text-xs font-medium text-[#8f3d32]">{shop.text("cash_out")}</span>
            <p className="mt-1 text-base font-bold tabular-nums text-[#8f3d32]">
              {formatRupees(shop.data.dailySummary?.cashOut ?? 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#616161]">
              Bills: {formatRupees(shop.data.dailySummary?.breakdown.billsPaid ?? 0)}
              {(shop.data.dailySummary?.breakdown.supplierPurchasesPaid ?? 0) > 0
                ? ` · Maal: ${formatRupees(shop.data.dailySummary?.breakdown.supplierPurchasesPaid ?? 0)}`
                : ""}
            </p>
          </div>

          <div className="rounded-xl bg-[#f8f9fa] p-3">
            <span className="text-xs font-medium text-[#616161]">Aaj Diya Udhaar</span>
            <p className="mt-1 text-base font-bold tabular-nums text-[#1a1c1e]">
              {formatRupees(shop.data.dailySummary?.breakdown.udhaarGiven ?? 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#616161]">Ledger mein likha gaya</p>
          </div>

          <div className="rounded-xl bg-[#f8f9fa] p-3">
            <span className="text-xs font-medium text-[#616161]">Dukaan Grahak</span>
            <p className="mt-1 text-base font-bold tabular-nums text-[#1a1c1e]">{customers.length}</p>
            <p className="mt-0.5 text-[11px] text-[#616161]">Kul udhaar: {formatRupees(outstanding)}</p>
          </div>
        </div>
      </section>

      {/* Main KPI Cards Grid */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label={shop.text("nav_udhaar")} value={formatRupees(outstanding)} href="/app/udhaar" />
        <Kpi label={shop.text("nav_jama")} value={formatRupees(received)} href="/app/jama" />
        <Kpi label={shop.text("nav_rentals")} value={formatRupees(shop.data.assets?.length ?? 0)} href="/app/rentals" />
        <Kpi label={shop.text("kiraya_diya_tab")} value={formatRupees(rentDue)} href="/app/kiraya" />
        <Kpi label={shop.text("nav_bills")} value={formatRupees(billsDue)} href="/app/bills" />
        <Kpi
          label={shop.text("nav_suppliers")}
          value={formatRupees(
            shop.data.purchases?.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0) ?? 0,
          )}
          href="/app/suppliers"
        />
      </section>
      <section className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{shop.text("recent")}</h2>
          <Link href="/app/baat" className="text-sm font-medium text-[#8d5a2b]">{shop.text("open_chat")}</Link>
        </div>
        {activity.length === 0 ? (
          <div className="rounded-xl border border-border bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold">{shop.text("empty_activity")}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#616161]">Nayi dukaan khaali hoti hai. Udhaar likho, ya Baat mein bolo. Sample data Settings mein hai, aur sirf nakli numbers use karta hai.</p>
            <button type="button" className="btn btn-primary mt-4" onClick={() => shop.openDraft(blankDraft("udhaar", "manual"))}>Add udhaar</button>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border bg-white">
            {activity.map((item) => (
              <li key={item.id} className="border-b border-[#f1f2f4] last:border-0">
                <Link href={item.href} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-[#616161]">{item.meta} · {formatWhen(item.at)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={item.tone}>{item.badge}</Badge>
                    <span className="text-sm font-semibold tabular-nums">{formatRupees(item.amount)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </main>
  );
}

function Kpi({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl border border-border bg-white px-4 py-3 hover:border-[#c8ccd0]">
      <p className="text-xs text-[#616161]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Link>
  );
}
