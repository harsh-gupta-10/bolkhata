"use client";

import { useState } from "react";
import { draftGate, useShop, type PersonOption } from "@/components/shop-provider";
import { formatPhone, formatRupees } from "@/lib/format";

export function DraftPanel() {
  const shop = useShop();
  const draft = shop.draft;
  const [attempted, setAttempted] = useState(false);
  if (!draft) return null;
  const gate = draftGate(draft);
  const person = draft.people.find((item) => item.id === draft.customerId);
  const showPerson =
    draft.intent === "udhaar" ||
    draft.intent === "payment" ||
    draft.intent === "add_customer" ||
    draft.intent === "balance" ||
    draft.intent === "rent_received" ||
    draft.intent === "start_rental";

  const customerRecord = shop.data.customers.find((c) => c.id === draft.customerId);
  const creditLimit = customerRecord?.credit_limit ?? null;
  const isOverCreditLimit =
    draft.intent === "udhaar" &&
    creditLimit != null &&
    creditLimit > 0 &&
    gate.balanceAfter != null &&
    gate.balanceAfter > creditLimit;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#1a1c1e]/45 p-3 sm:items-center">
      <section className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl" aria-labelledby="confirm-title">
        <header className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8d5a2b] uppercase">
            {draft.intent === "balance" ? shop.text("balance") : shop.text("confirm")}
          </p>
          <h2 id="confirm-title" className="mt-2 text-2xl font-semibold tracking-tight">
            {showPerson
              ? person?.name || draft.name || shop.text("field_name")
              : draft.intent === "supplier_purchase"
                ? draft.supplierName || draft.name || shop.text("supplier_name")
                : draft.party || draft.label || (draft.intent === "rent" ? shop.text("nav_kiraya") : shop.text("nav_bills"))}
          </h2>
          {showPerson ? (
            <p className="mt-1 text-lg tabular-nums text-[#1a1c1e]">{formatPhone(draft.phone) || shop.text("phone_now")}</p>
          ) : (
            <p className="mt-1 text-lg font-semibold tabular-nums">{draft.amount ? formatRupees(Number(draft.amount)) : shop.text("amount")}</p>
          )}
        </header>

        <div className="space-y-3 px-5 py-4">
          {/* Credit Limit Warning Banner */}
          {isOverCreditLimit ? (
            <div className="rounded-lg border border-[#e2a03f] bg-[#fbf5ea] p-3 text-sm text-[#7a410d]">
              <div className="flex items-center gap-2 font-semibold text-[#8d5a2b]">
                <span>⚠️</span>
                <span>{shop.text("credit_limit_warning")}</span>
              </div>
              <p className="mt-1">
                {shop.locale === "en"
                  ? `Limit is ${formatRupees(creditLimit)}, current balance is ${formatRupees(Number(customerRecord?.balance) || 0)}, this entry makes it ${formatRupees(gate.balanceAfter ?? 0)}.`
                  : `Limit ₹${formatRupees(creditLimit)} hai, abhi ₹${formatRupees(Number(customerRecord?.balance) || 0)} baaki hai, yeh likhne se ₹${formatRupees(gate.balanceAfter ?? 0)} ho jayega.`}
              </p>
            </div>
          ) : null}

          {/* Ambiguous Person Picker */}
          {draft.kind === "many" ? (
            <div>
              <p className="lbl">{shop.text("which")}</p>
              <div className="grid gap-2">
                {draft.people.map((item) => (
                  <PersonChoice
                    key={item.id}
                    person={item}
                    selected={draft.customerId === item.id}
                    onPick={() => shop.patchDraft({ customerId: item.id, name: item.name, phone: item.phone ?? "", kind: "one" })}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Person Name and Phone */}
          {showPerson && draft.kind !== "one" ? (
            <label className="lbl">
              {shop.text("field_name")}
              <input
                className="field mt-1"
                value={draft.name}
                onChange={(event) => shop.patchDraft({ name: event.target.value, customerId: "", kind: "none" })}
                onBlur={() => void shop.lookupDraft(draft.name)}
              />
            </label>
          ) : null}

          {showPerson && !person?.phone ? (
            <label className="lbl">
              {shop.text("phone")}
              <input
                className="field mt-1"
                inputMode="numeric"
                placeholder="90000 11111"
                value={draft.phone}
                onChange={(event) => shop.patchDraft({ phone: event.target.value })}
              />
            </label>
          ) : null}

          {/* Rental Asset Picker for Start/Return/Payment */}
          {draft.intent === "start_rental" || draft.intent === "return_rental" || draft.intent === "rent_received" ? (
            <label className="lbl">
              {shop.text("asset_name")}
              <select
                className="field mt-1"
                value={draft.assetId ?? ""}
                onChange={(event) => {
                  const aid = event.target.value;
                  const asset = shop.data.assets?.find((a) => a.id === aid);
                  shop.patchDraft({
                    assetId: aid,
                    amount: asset?.rate_amount ? String(asset.rate_amount) : draft.amount,
                    ratePeriod: asset?.rate_period ?? draft.ratePeriod,
                    deposit: asset?.security_deposit_amount ? String(asset.security_deposit_amount) : draft.deposit,
                  });
                }}
              >
                <option value="">-- Asset Chuno --</option>
                {shop.data.assets?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type === "property" ? "Property" : a.type === "equipment" ? "Equipment" : "Other"})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {/* Supplier Inputs */}
          {draft.intent === "supplier_purchase" ? (
            <>
              <label className="lbl">
                {shop.text("supplier_name")}
                <input
                  className="field mt-1"
                  value={draft.supplierName || draft.name}
                  onChange={(event) => shop.patchDraft({ supplierName: event.target.value, name: event.target.value })}
                />
              </label>
              <label className="lbl">
                {shop.text("supplier_phone")}
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  value={draft.phone}
                  onChange={(event) => shop.patchDraft({ phone: event.target.value })}
                />
              </label>
              <label className="lbl">
                {shop.text("items_bought")}
                <input
                  className="field mt-1"
                  placeholder="atta 10 katta, tel 2 peti"
                  value={draft.itemsText || draft.note}
                  onChange={(event) => shop.patchDraft({ itemsText: event.target.value, note: event.target.value })}
                />
              </label>
            </>
          ) : null}

          {/* Amount input for udhaar, payment, rent, bill, rent_received, start_rental, supplier_purchase */}
          {draft.intent !== "balance" && draft.intent !== "add_customer" && draft.intent !== "return_rental" ? (
            <label className="lbl">
              {draft.intent === "start_rental" ? shop.text("rate_amount") : shop.text("amount")}
              <input
                className="field mt-1"
                inputMode="numeric"
                value={draft.amount}
                onChange={(event) => shop.patchDraft({ amount: event.target.value })}
              />
            </label>
          ) : null}

          {/* Start Rental specific fields */}
          {draft.intent === "start_rental" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="lbl">
                {shop.text("rate_period")}
                <select
                  className="field mt-1"
                  value={draft.ratePeriod ?? "per_day"}
                  onChange={(event) => shop.patchDraft({ ratePeriod: event.target.value as any })}
                >
                  <option value="per_day">{shop.text("per_day")}</option>
                  <option value="per_week">{shop.text("per_week")}</option>
                  <option value="per_month">{shop.text("per_month")}</option>
                  <option value="one_time">{shop.text("one_time")}</option>
                </select>
              </label>
              <label className="lbl">
                {shop.text("security_deposit")}
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  value={draft.deposit ?? ""}
                  placeholder="₹0"
                  onChange={(event) => shop.patchDraft({ deposit: event.target.value })}
                />
              </label>
            </div>
          ) : null}

          {/* Return Rental deduction fields */}
          {draft.intent === "return_rental" ? (
            <div className="space-y-2">
              <label className="lbl">
                {shop.text("deductions")}
                <input
                  className="field mt-1"
                  inputMode="numeric"
                  placeholder="₹0"
                  value={draft.deposit ?? ""}
                  onChange={(event) => shop.patchDraft({ deposit: event.target.value })}
                />
              </label>
              <label className="lbl">
                {shop.text("deduction_reason")}
                <input
                  className="field mt-1"
                  placeholder="Damage, delay, etc."
                  value={draft.note}
                  onChange={(event) => shop.patchDraft({ note: event.target.value })}
                />
              </label>
            </div>
          ) : null}

          {/* Payment mode for rent_received */}
          {draft.intent === "rent_received" ? (
            <label className="lbl">
              Payment Mode
              <select
                className="field mt-1"
                value={draft.paymentMode ?? "cash"}
                onChange={(event) => shop.patchDraft({ paymentMode: event.target.value as any })}
              >
                <option value="cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="other">Other</option>
              </select>
            </label>
          ) : null}

          {/* Due Date for Udhaar or End Date for Start Rental */}
          {draft.intent === "udhaar" || draft.intent === "start_rental" ? (
            <label className="lbl">
              {draft.intent === "udhaar" ? shop.text("due_date") : shop.text("expected_return")}
              <input
                type="date"
                className="field mt-1"
                value={draft.dueDate ?? ""}
                onChange={(event) => shop.patchDraft({ dueDate: event.target.value })}
              />
            </label>
          ) : null}

          {/* Bill & Rent Paid specific fields */}
          {draft.intent === "rent" || draft.intent === "bill" ? (
            <>
              <label className="lbl">
                {shop.text("status")}
                <select className="field mt-1" value={draft.status} onChange={(event) => shop.patchDraft({ status: event.target.value as "due" | "paid" })}>
                  <option value="due">{shop.text("due")}</option>
                  <option value="paid">{shop.text("paid")}</option>
                </select>
              </label>
              {draft.intent === "bill" ? (
                <label className="lbl">
                  Category
                  <select
                    className="field mt-1"
                    value={draft.billKind}
                    onChange={(event) =>
                      shop.patchDraft({
                        billKind: event.target.value as "bijli" | "paani" | "other",
                        label: event.target.value === "bijli" ? "Bijli" : event.target.value === "paani" ? "Paani" : draft.label,
                      })
                    }
                  >
                    <option value="bijli">Bijli</option>
                    <option value="paani">Paani</option>
                    <option value="other">Aur</option>
                  </select>
                </label>
              ) : null}
              <label className="lbl">
                {draft.intent === "rent" ? shop.text("landlord") : shop.text("vendor")}
                <input className="field mt-1" value={draft.party} onChange={(event) => shop.patchDraft({ party: event.target.value })} />
              </label>
              <label className="lbl">
                {shop.text("period")}
                <input className="field mt-1" placeholder="November 2026" value={draft.period} onChange={(event) => shop.patchDraft({ period: event.target.value })} />
              </label>
            </>
          ) : null}

          {/* General Note */}
          {draft.intent !== "balance" && draft.intent !== "add_customer" && draft.intent !== "return_rental" ? (
            <label className="lbl">
              {shop.text("note")}
              <input className="field mt-1" value={draft.note} onChange={(event) => shop.patchDraft({ note: event.target.value })} />
            </label>
          ) : null}

          {/* Udhaar / Jama Balance Projection */}
          {showPerson && (draft.intent === "udhaar" || draft.intent === "payment") && person ? (
            <p className="rounded-lg bg-[#f6f6f7] px-3 py-2 text-sm">
              {draft.intent === "udhaar" ? "Udhaar" : "Jama"} {draft.amount ? formatRupees(Number(draft.amount.replace(/[^\d]/g, ""))) : ""}
              {draft.note ? ` · ${draft.note}` : ""}. Baaki {formatRupees(Number(person.balance) || 0)}
              {gate.balanceAfter != null ? ` → ${formatRupees(gate.balanceAfter)}` : ""}.
            </p>
          ) : null}

          {draft.intent === "balance" && person ? (
            <p className="text-sm">Kuch likha nahi jayega. Baaki {formatRupees(Number(person.balance) || 0)} hai.</p>
          ) : null}

          {attempted && !gate.ok && draft.intent !== "balance" ? (
            <p className="text-sm text-[#8f3d32]">{gate.reason || shop.text("amount_needed")}</p>
          ) : null}

          <div className="flex gap-2 pt-1">
            {draft.intent !== "balance" ? (
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={shop.saving}
                onClick={() => {
                  if (!gate.ok) {
                    setAttempted(true);
                    return;
                  }
                  void shop.confirmDraft();
                }}
              >
                {shop.saving ? "…" : shop.text("confirm")}
              </button>
            ) : (
              <button type="button" className="btn btn-primary flex-1" onClick={() => void shop.confirmDraft()}>
                {shop.text("confirm")}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={shop.dismissDraft}>
              {shop.text("cancel")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PersonChoice({ person, selected, onPick }: { person: PersonOption; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className={`flex h-12 items-center justify-between rounded-lg border px-3 text-left text-sm ${selected ? "border-[#1a1c1e] bg-[#1a1c1e] text-white" : "border-border"}`}>
      <span className="font-medium">{person.name}</span>
      <span className="tabular-nums">{formatPhone(person.phone ?? undefined) || "phone nahi"}</span>
    </button>
  );
}
