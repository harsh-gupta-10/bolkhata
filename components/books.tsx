"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, FileText, MessageSquare, Printer } from "lucide-react";
import { formatPhone, formatRupees, formatWhen, isoFromIstLocal, istLocalInput } from "@/lib/format";
import { wholeRupees } from "@/lib/money";
import type { CustomerRow, EntryRow, RecordRow } from "@/lib/repo";
import { contactPickerAvailable, pickContacts } from "@/lib/contacts";
import { blankDraft, useShop } from "@/components/shop-provider";
import { MemoryPanel } from "@/components/memory-panel";
import { Badge, DataTable, EmptyState, Modal, PageHeader } from "@/components/ui-bits";

export function EntryBook({ type }: { type: "udhaar" | "payment" }) {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [span, setSpan] = useState<"all" | "month">("all");
  const [editing, setEditing] = useState<EntryRow | null>(null);
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return shop.data.entries.filter((entry) => {
      if (entry.type !== type) return false;
      if (span === "month" && !sameMonth(entry.created_at)) return false;
      if (!needle) return true;
      return `${entry.customer_name} ${entry.customer_phone ?? ""} ${entry.note ?? ""}`.toLowerCase().includes(needle);
    });
  }, [query, shop.data.entries, span, type]);
  const outstanding = shop.data.customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance) || 0), 0);
  const received = rows.reduce((sum, entry) => sum + Number(entry.amount), 0);

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <PageHeader
        title={type === "udhaar" ? shop.text("nav_udhaar") : shop.text("nav_jama")}
        subtitle={type === "udhaar" ? shop.text("sub_udhaar") : shop.text("sub_jama")}
        action={
          <div className="flex gap-2">
            <a
              href={`/api/export?book=${type}`}
              download
              className="btn btn-secondary hidden sm:inline-flex items-center gap-1.5 text-xs h-9"
            >
              <Download size={14} /> {shop.text("export_csv")}
            </a>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => shop.openDraft(blankDraft(type === "udhaar" ? "udhaar" : "payment", "manual"))}
            >
              {type === "udhaar" ? shop.text("add_udhaar") : shop.text("add_jama")}
            </button>
          </div>
        }
      />
      <p className="mb-3 text-sm text-[#616161]">{type === "udhaar" ? `${shop.text("owed")} ${formatRupees(outstanding)}` : `${shop.text("in_list")} ${formatRupees(received)}`}</p>
      <Filters query={query} onQuery={setQuery} span={span} onSpan={setSpan} />
      {rows.length === 0 ? (
        <EmptyState title={type === "udhaar" ? shop.text("empty_udhaar") : shop.text("empty_jama")} body={shop.text("home_line")} action={<button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft(type === "udhaar" ? "udhaar" : "payment", "manual"))}>{type === "udhaar" ? shop.text("add_udhaar") : shop.text("add_jama")}</button>} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          onRow={setEditing}
          card={(row) => {
            const today = new Date().toISOString().slice(0, 10);
            const isOverdue = type === "udhaar" && row.due_date && row.due_date < today;
            return (
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-base font-semibold">{row.customer_name}</span>
                  <span className="mt-0.5 block text-sm text-[#616161]">{formatPhone(row.customer_phone ?? undefined) ?? "—"}{row.note ? ` · ${row.note}` : ""}</span>
                  <span className="mt-1 block text-xs whitespace-nowrap text-[#616161]">
                    {formatWhen(row.created_at)}
                    {row.due_date ? ` · Due: ${row.due_date}` : ""}
                  </span>
                  {isOverdue ? (
                    <span className="mt-1 inline-block">
                      <Badge tone="warning">Overdue</Badge>
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block text-base font-semibold tabular-nums ${type === "payment" ? "text-[#1f6b45]" : "text-[#8f3d32]"}`}>{formatRupees(row.amount)}</span>
                  <span className="mt-1 block text-xs tabular-nums text-[#616161]">{formatRupees(row.running_balance)}</span>
                </span>
              </span>
            );
          }}
          columns={[
            { key: "date", header: shop.text("date"), sortValue: (row) => row.created_at, render: (row) => formatWhen(row.created_at) },
            { key: "name", header: shop.text("customer"), sortValue: (row) => row.customer_name, render: (row) => <span className="font-medium">{row.customer_name}</span> },
            { key: "phone", header: shop.text("phone"), render: (row) => formatPhone(row.customer_phone ?? undefined) ?? "—" },
            { key: "note", header: shop.text("note"), render: (row) => row.note || "—" },
            {
              key: "due",
              header: "Due Date",
              render: (row) =>
                row.due_date ? (
                  <span>
                    {row.due_date}{" "}
                    {row.due_date < new Date().toISOString().slice(0, 10) && type === "udhaar" ? (
                      <Badge tone="warning">Overdue</Badge>
                    ) : null}
                  </span>
                ) : (
                  "—"
                ),
            },
            { key: "amount", header: shop.text("amount"), align: "right", sortValue: (row) => Number(row.amount), render: (row) => <span className={type === "payment" ? "font-semibold text-[#1f6b45]" : "font-semibold text-[#8f3d32]"}>{formatRupees(row.amount)}</span> },
            { key: "balance", header: shop.text("balance"), align: "right", sortValue: (row) => Number(row.running_balance), render: (row) => formatRupees(row.running_balance) },
          ]}
        />
      )}
      {editing ? <EntryEditor entry={editing} customers={shop.data.customers} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await shop.reload(); }} /> : null}
    </div>
    </main>
  );
}

export function RecordBook({ kind }: { kind: "rent" | "bill" }) {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "due" | "paid">("all");
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const rows = shop.data.records.filter((record) => {
    if (record.kind !== kind) return false;
    if (status !== "all" && record.status !== status) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${record.label} ${record.party ?? ""} ${record.period ?? ""} ${record.note ?? ""}`.toLowerCase().includes(needle);
  });
  const due = rows.filter((record) => record.status === "due").reduce((sum, record) => sum + Number(record.amount), 0);

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <PageHeader
        title={kind === "rent" ? shop.text("nav_kiraya") : shop.text("nav_bills")}
        subtitle={kind === "rent" ? shop.text("sub_rent") : shop.text("sub_bills")}
        action={
          <div className="flex gap-2">
            <a
              href={`/api/export?book=${kind}`}
              download
              className="btn btn-secondary hidden sm:inline-flex items-center gap-1.5 text-xs h-9"
            >
              <Download size={14} /> {shop.text("export_csv")}
            </a>
            <button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft(kind, "manual"))}>
              {kind === "rent" ? shop.text("add_kiraya") : shop.text("add_bill")}
            </button>
          </div>
        }
      />
      <p className="mb-3 text-sm text-[#616161]">Due {formatRupees(due)}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="field w-full sm:max-w-xs" value={query} placeholder={shop.text("search")} aria-label={shop.text("search")} onChange={(event) => setQuery(event.target.value)} />
        {(["all", "due", "paid"] as const).map((item) => (
          <button key={item} type="button" className={`btn ${status === item ? "btn-primary" : "btn-secondary"}`} onClick={() => setStatus(item)}>{item === "all" ? shop.text("all") : item === "due" ? shop.text("due") : shop.text("paid")}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={kind === "rent" ? shop.text("empty_rent") : shop.text("empty_bills")} body={kind === "rent" ? shop.text("empty_rent_body") : shop.text("empty_bills_body")} action={<button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft(kind, "manual"))}>{kind === "rent" ? shop.text("add_kiraya") : shop.text("add_bill")}</button>} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          onRow={setEditing}
          card={(row) => (
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-base font-semibold">{row.label}</span>
                <span className="mt-0.5 block text-sm text-[#616161]">{row.party || "—"} · {row.period || "—"}</span>
                <span className="mt-1 block text-xs whitespace-nowrap text-[#616161]">
                  {formatWhen(row.created_at)} · {row.status === "paid" ? shop.text("paid") : shop.text("due")}
                  {row.is_recurring ? ` · Har mahine ${row.recurring_day} ko` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-base font-semibold tabular-nums">{formatRupees(row.amount)}</span>
                {row.status === "due" ? (
                  <button
                    type="button"
                    className="mt-1 block text-xs font-semibold text-[#1f6b45] hover:underline"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await fetch(`/api/records/${row.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "paid" }),
                      });
                      await shop.reload();
                    }}
                  >
                    Mark Paid
                  </button>
                ) : null}
              </span>
            </span>
          )}
          columns={[
            { key: "date", header: "Date", sortValue: (row) => row.created_at, render: (row) => formatWhen(row.created_at) },
            { key: "label", header: "Label", sortValue: (row) => row.label, render: (row) => row.label },
            { key: "party", header: kind === "rent" ? "Landlord" : "Vendor", render: (row) => row.party || "—" },
            { key: "period", header: "Period", render: (row) => row.period || "—" },
            {
              key: "status",
              header: "Status",
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <Badge tone={row.status === "paid" ? "paid" : "due"}>{row.status === "paid" ? "Jama" : "Due"}</Badge>
                  {row.status === "due" ? (
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-[#1f6b45] hover:underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await fetch(`/api/records/${row.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: "paid" }),
                        });
                        await shop.reload();
                      }}
                    >
                      Mark Paid
                    </button>
                  ) : null}
                </div>
              ),
            },
            { key: "amount", header: "Amount", align: "right", sortValue: (row) => Number(row.amount), render: (row) => formatRupees(row.amount) },
          ]}
        />
      )}
      {editing ? <RecordEditor record={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await shop.reload(); }} /> : null}
    </div>
    </main>
  );
}

export function PeopleBook() {
  const shop = useShop();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [pickerNote, setPickerNote] = useState("");
  const rows = shop.data.customers.filter((customer) => `${customer.name} ${customer.phone ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <PageHeader
        title={shop.text("nav_grahak")}
        subtitle={`${rows.length} ${shop.text("sub_people")}`}
        action={
          <span className="flex gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => void importContacts(setPickerNote, shop.openDraft)}>Phone contacts</button>
            <button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft("add_customer", "manual"))}>{shop.text("add_customer")}</button>
          </span>
        }
      />
      {pickerNote ? <p className="mb-3 text-sm text-[#616161]">{pickerNote}</p> : null}
      <input className="field mb-3 w-full sm:max-w-xs" value={query} placeholder={shop.text("search")} aria-label={shop.text("search")} onChange={(event) => setQuery(event.target.value)} />
      {rows.length === 0 ? (
        <EmptyState title={shop.text("empty_people")} body={shop.text("chat_body")} action={<button type="button" className="btn btn-primary" onClick={() => shop.openDraft(blankDraft("add_customer", "manual"))}>{shop.text("add_customer")}</button>} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => row.id}
          onRow={(row) => router.push(`/app/grahak/${row.id}`)}
          card={(row) => (
            <span className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-base font-semibold">{row.name}</span>
                <span className="mt-0.5 block text-sm text-[#616161]">{formatPhone(row.phone ?? undefined) ?? "—"}</span>
              </span>
              <span className="shrink-0 text-base font-semibold tabular-nums">{formatRupees(Number(row.balance) || 0)}</span>
            </span>
          )}
          columns={[
            { key: "name", header: shop.text("field_name"), sortValue: (row) => row.name, render: (row) => <Link href={`/app/grahak/${row.id}`} className="font-medium" onClick={(event) => event.stopPropagation()}>{row.name}</Link> },
            { key: "phone", header: shop.text("phone"), sortValue: (row) => row.phone ?? "", render: (row) => formatPhone(row.phone ?? undefined) ?? "—" },
            { key: "balance", header: shop.text("balance"), align: "right", sortValue: (row) => Number(row.balance), render: (row) => formatRupees(Number(row.balance) || 0) },
            { key: "edit", header: "", render: (row) => <button type="button" className="text-sm font-medium" onClick={(event) => { event.stopPropagation(); setEditing(row); }}>Edit</button> },
          ]}
        />
      )}
      {editing ? <CustomerEditor customer={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await shop.reload(); }} /> : null}
      <MemoryPanel />
    </div>
    </main>
  );
}

export function PersonDetail({ id }: { id: string }) {
  const shop = useShop();
  const [statementOpen, setStatementOpen] = useState(false);
  const customer = shop.data.customers.find((item) => item.id === id);
  if (!customer) return <main className="px-6 py-16">Yeh grahak nahi mila.</main>;
  const entries = shop.data.entries.filter((entry) => entry.customer_id === id);
  const balance = Number(customer.balance) || 0;
  const digits = customer.phone?.replace(/\D/g, "") ?? "";
  const validPhone = digits.length === 10;
  const waUrl = validPhone
    ? `https://wa.me/91${digits}?text=${encodeURIComponent(`Namaste ${customer.name} ji, aapka BolKhata hisaab ₹${balance} baaki hai. Kripya dekh lijiye.`)}`
    : null;
  const smsUrl = validPhone
    ? `sms:+91${digits}?body=${encodeURIComponent(`Namaste ${customer.name} ji, aapka BolKhata hisaab ₹${balance} baaki hai.`)}`
    : null;

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <Link href="/app/grahak" className="text-sm text-[#616161]">Grahak</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{customer.name}</h1>
          <p className="text-lg tabular-nums">{formatPhone(customer.phone ?? undefined) ?? "Phone nahi"}</p>
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{formatRupees(balance)}</p>
              <p className="text-xs text-[#616161]">{shop.text("balance")}</p>
            </div>
            {Number(customer.credit_limit) > 0 ? (
              <div className="border-l border-[#e0e0e0] pl-3">
                <p className="text-lg font-semibold tabular-nums text-[#616161]">{formatRupees(customer.credit_limit)}</p>
                <p className="text-xs text-[#616161]">{shop.text("credit_limit")}</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary text-xs" onClick={() => setStatementOpen(true)}>
            <FileText size={14} className="inline mr-1" /> {shop.text("monthly_statement")}
          </button>
          <a href={`/api/export?book=udhaar&customerId=${customer.id}`} download className="btn btn-secondary text-xs">
            <Download size={14} className="inline mr-1" /> {shop.text("export_csv")}
          </a>
          {validPhone && balance > 0 ? (
            <>
              <a href={waUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-secondary text-xs text-[#235c39] border-[#235c39]/30">
                <MessageSquare size={14} className="inline mr-1" /> {shop.text("remind_whatsapp")}
              </a>
              <a href={smsUrl!} className="btn btn-secondary text-xs">
                {shop.text("remind_sms")}
              </a>
            </>
          ) : null}
          <button type="button" className="btn btn-primary text-xs" onClick={() => shop.openDraft({ ...blankDraft("udhaar", "manual"), name: customer.name, phone: customer.phone ?? "", customerId: customer.id, kind: "one", people: [{ id: customer.id, name: customer.name, phone: customer.phone, balance }] })}>Add udhaar</button>
          <button type="button" className="btn btn-secondary text-xs" onClick={() => shop.openDraft({ ...blankDraft("payment", "manual"), name: customer.name, phone: customer.phone ?? "", customerId: customer.id, kind: "one", people: [{ id: customer.id, name: customer.name, phone: customer.phone, balance }] })}>Add jama</button>
        </div>
      </div>
      <div className="mt-5">
        {entries.length === 0 ? <EmptyState title="Khata khaali hai" body="Pehli line udhaar ya jama se aayegi." /> : (
          <DataTable
            rows={entries}
            rowKey={(row) => row.id}
            card={(row) => (
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{row.type === "payment" ? shop.text("paid") : shop.text("nav_udhaar")}</span>
                  <span className="mt-0.5 block text-sm text-[#616161]">{row.note || "—"}</span>
                  <span className="mt-1 block text-xs whitespace-nowrap text-[#616161]">{formatWhen(row.created_at)}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-semibold tabular-nums">{formatRupees(row.amount)}</span>
                  <span className="mt-1 block text-xs tabular-nums text-[#616161]">{formatRupees(row.running_balance)}</span>
                </span>
              </span>
            )}
            columns={[
              { key: "date", header: "Date", sortValue: (row) => row.created_at, render: (row) => formatWhen(row.created_at) },
              { key: "type", header: "Type", render: (row) => <Badge tone={row.type === "payment" ? "paid" : "due"}>{row.type === "payment" ? "Jama" : "Udhaar"}</Badge> },
              { key: "note", header: "Note", render: (row) => row.note || "—" },
              { key: "amount", header: "Amount", align: "right", sortValue: (row) => Number(row.amount), render: (row) => formatRupees(row.amount) },
              { key: "balance", header: "Baaki", align: "right", render: (row) => formatRupees(row.running_balance) },
            ]}
          />
        )}
      </div>
      {statementOpen ? <StatementModal customer={customer} entries={entries} onClose={() => setStatementOpen(false)} /> : null}
    </div>
    </main>
  );
}

function StatementModal({ customer, entries, onClose }: { customer: CustomerRow; entries: EntryRow[]; onClose: () => void }) {
  const shop = useShop();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const months = Array.from(new Set(entries.map((e) => e.created_at.slice(0, 7)))).sort().reverse();
  const filteredEntries = selectedMonth === "all" ? entries : entries.filter((e) => e.created_at.startsWith(selectedMonth));
  const totalUdhaar = filteredEntries.filter((e) => e.type === "udhaar").reduce((acc, e) => acc + Number(e.amount), 0);
  const totalJama = filteredEntries.filter((e) => e.type === "payment").reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <Modal title={`${shop.text("monthly_statement")} — ${customer.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-[#e0e0e0] pb-3">
          <div>
            <h2 className="text-base font-bold">{shop.data?.shop?.name || "BolKhata"}</h2>
            <p className="text-xs text-[#616161]">Grahak: <span className="font-semibold text-[#212121]">{customer.name}</span> · {formatPhone(customer.phone ?? undefined) ?? "Phone nahi"}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-[#616161]">Kul Baaki (Net Due)</span>
            <p className="text-xl font-bold tabular-nums text-[#8f3d32]">{formatRupees(Number(customer.balance) || 0)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-medium text-[#616161]">
            Mahina:
            <select className="field ml-2 inline-block w-auto py-1 text-xs" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="all">Poora Hisaab (All Time)</option>
              {months.map((m) => (
                <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" className="btn btn-secondary text-xs py-1" onClick={() => window.print()}>
              <Printer size={13} className="inline mr-1" /> Print / PDF
            </button>
            <a href={`/api/export?book=udhaar&customerId=${customer.id}`} download className="btn btn-secondary text-xs py-1">
              <Download size={13} className="inline mr-1" /> CSV
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-[#f5f5f5] p-3 text-center text-sm">
          <div>
            <span className="block text-xs text-[#616161]">Diya (Udhaar)</span>
            <span className="font-semibold tabular-nums text-[#8f3d32]">{formatRupees(totalUdhaar)}</span>
          </div>
          <div>
            <span className="block text-xs text-[#616161]">Aaya (Jama)</span>
            <span className="font-semibold tabular-nums text-[#235c39]">{formatRupees(totalJama)}</span>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border border-[#e0e0e0] rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0ede6] text-[#616161]">
              <tr>
                <th className="p-2">Date</th>
                <th className="p-2">Type</th>
                <th className="p-2">Details</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">Baaki</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filteredEntries.map((row) => (
                <tr key={row.id}>
                  <td className="p-2 whitespace-nowrap">{formatWhen(row.created_at)}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 font-medium ${row.type === "payment" ? "bg-[#e2f1e6] text-[#235c39]" : "bg-[#fbe9e7] text-[#8f3d32]"}`}>
                      {row.type === "payment" ? "Jama" : "Udhaar"}
                    </span>
                  </td>
                  <td className="p-2">{row.note || "—"}</td>
                  <td className="p-2 text-right font-medium tabular-nums">{formatRupees(row.amount)}</td>
                  <td className="p-2 text-right tabular-nums text-[#616161]">{formatRupees(row.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-[11px] text-[#757575]">
          BolKhata digital parchi · {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} ko banayi gayi
        </p>
      </div>
    </Modal>
  );
}

function Filters({ query, onQuery, span, onSpan }: { query: string; onQuery: (value: string) => void; span: "all" | "month"; onSpan: (value: "all" | "month") => void }) {
  const shop = useShop();
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <input className="field w-full sm:max-w-xs" value={query} placeholder={shop.text("search")} aria-label={shop.text("search")} onChange={(event) => onQuery(event.target.value)} />
      <button type="button" className={`btn ${span === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => onSpan("all")}>{shop.text("all")}</button>
      <button type="button" className={`btn ${span === "month" ? "btn-primary" : "btn-secondary"}`} onClick={() => onSpan("month")}>{shop.text("month")}</button>
    </div>
  );
}

function sameMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

async function importContacts(setNote: (value: string) => void, openDraft: (draft: ReturnType<typeof blankDraft>) => void) {
  if (!contactPickerAvailable()) {
    setNote("Is browser mein poori contacts list nahi khulti. Naam aur phone haath se, ya Baat mein, likho.");
    return;
  }
  try {
    const picked = await pickContacts();
    const first = picked[0];
    if (!first) return;
    const draft = blankDraft("add_customer", "contacts");
    draft.name = first.name;
    draft.phone = first.phone ?? "";
    openDraft(draft);
    if (picked.length > 1) setNote("Ek baar mein ek insaan confirm hota hai. Baaki contacts ke liye picker dobara kholo.");
  } catch {
    setNote("Contacts nahi khule. Haath se jod sakte ho.");
  }
}

function EntryEditor({ entry, customers, onClose, onSaved }: { entry: EntryRow; customers: CustomerRow[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [customerId, setCustomerId] = useState(entry.customer_id);
  const [amount, setAmount] = useState(String(entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [createdAt, setCreatedAt] = useState(istLocalInput(entry.created_at));
  const [error, setError] = useState("");
  return (
    <Modal title="Line theek karo" onClose={onClose}>
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch(`/api/entries/${entry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, amount: Number(amount), note, createdAt: isoFromIstLocal(createdAt), confirmed: true }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error || "Update nahi hua.");
          return;
        }
        await onSaved();
      }}>
        <label className="lbl">Grahak ko assign karo
          <select className="field mt-1" value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {formatPhone(customer.phone ?? undefined) ?? "phone nahi"}</option>)}
          </select>
        </label>
        <label className="lbl">Amount<input className="field mt-1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label className="lbl">Note<input className="field mt-1" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <label className="lbl">Tareekh<input className="field mt-1" type="datetime-local" value={createdAt} onChange={(event) => setCreatedAt(event.target.value)} /></label>
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

function RecordEditor({ record, onClose, onSaved }: { record: RecordRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const [label, setLabel] = useState(record.label);
  const [amount, setAmount] = useState(String(record.amount));
  const [status, setStatus] = useState(record.status);
  const [party, setParty] = useState(record.party ?? "");
  const [period, setPeriod] = useState(record.period ?? "");
  const [billKind, setBillKind] = useState(record.bill_kind ?? "other");
  const [note, setNote] = useState(record.note ?? "");
  const [createdAt, setCreatedAt] = useState(istLocalInput(record.created_at));
  const [isRecurring, setIsRecurring] = useState(Boolean(record.is_recurring));
  const [recurringDay, setRecurringDay] = useState(record.recurring_day ? String(record.recurring_day) : "1");
  return (
    <Modal title={record.kind === "rent" ? "Kiraya theek karo" : "Bill theek karo"} onClose={onClose}>
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch(`/api/records/${record.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label,
            amount: Number(amount),
            status,
            party,
            period,
            billKind,
            note,
            createdAt: isoFromIstLocal(createdAt),
            isRecurring,
            recurringDay: isRecurring ? Number(recurringDay) : null,
            confirmed: true
          }),
        });
        if (!response.ok) return;
        await onSaved();
      }}>
        <label className="lbl">Label<input className="field mt-1" value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <label className="lbl">Amount<input className="field mt-1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label className="lbl">Status
          <select className="field mt-1" value={status} onChange={(event) => setStatus(event.target.value as "due" | "paid")}>
            <option value="due">Due</option>
            <option value="paid">Jama</option>
          </select>
        </label>
        {record.kind === "bill" ? (
          <label className="lbl">Category
            <select className="field mt-1" value={billKind} onChange={(event) => setBillKind(event.target.value)}>
              <option value="bijli">Bijli</option>
              <option value="paani">Paani</option>
              <option value="other">Aur</option>
            </select>
          </label>
        ) : null}
        <label className="lbl">{record.kind === "rent" ? "Landlord" : "Vendor"}<input className="field mt-1" value={party} onChange={(event) => setParty(event.target.value)} /></label>
        <label className="lbl">Period<input className="field mt-1" value={period} onChange={(event) => setPeriod(event.target.value)} /></label>
        <label className="lbl">Note<input className="field mt-1" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <label className="lbl">Tareekh<input className="field mt-1" type="datetime-local" value={createdAt} onChange={(event) => setCreatedAt(event.target.value)} /></label>
        <label className="lbl flex items-center gap-2 cursor-pointer pt-1">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="rounded" />
          <span>Har mahine aane wala (Recurring)</span>
        </label>
        {isRecurring ? (
          <label className="lbl">Mahine ki due tareekh (1-31)
            <input className="field mt-1" type="number" min="1" max="31" value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)} />
          </label>
        ) : null}
        <button type="submit" className="btn btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}

function CustomerEditor({ customer, onClose, onSaved }: { customer: CustomerRow; onClose: () => void; onSaved: () => Promise<void> }) {
  const shop = useShop();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit ? String(customer.credit_limit) : "");
  const [error, setError] = useState("");
  return (
    <Modal title="Grahak theek karo" onClose={onClose}>
      <form className="space-y-3" onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch(`/api/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, creditLimit: creditLimit ? Number(creditLimit) : null }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          setError(body.error || "Update nahi hua.");
          return;
        }
        await onSaved();
      }}>
        <label className="lbl">Naam<input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="lbl">Phone<input className="field mt-1" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="lbl">{shop.text("credit_limit")} (₹, optional)<input className="field mt-1" inputMode="numeric" placeholder="e.g. 5000" value={creditLimit} onChange={(event) => setCreditLimit(event.target.value)} /></label>
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <button type="submit" className="btn btn-primary w-full">Save</button>
      </form>
    </Modal>
  );
}
