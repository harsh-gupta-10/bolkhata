"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  KeyRound,
  MessageSquare,
  Plus,
  RotateCcw,
  Shield,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { formatPhone, formatRupees, formatWhen } from "@/lib/format";
import { wholeRupees } from "@/lib/money";
import {
  computeAgreementFinancials,
  computeEquipmentRentalCost,
  computeShopRentalsSummary,
} from "@/lib/rentals-math";
import type { RentalAgreementRow, RentalAssetRow, RentalPaymentRow } from "@/lib/repo";
import { blankDraft, useShop } from "@/components/shop-provider";
import { Badge, Modal, PageHeader, SampleTag } from "@/components/ui-bits";
import { RecordBook } from "@/components/books";

export function RentalsView({ initialTab = "income" }: { initialTab?: "income" | "expense" }) {
  const shop = useShop();
  const [activeTab, setActiveTab] = useState<"income" | "expense">(initialTab);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "rented" | "maintenance" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<RentalAssetRow | null>(null);

  // Modals
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showStartRental, setShowStartRental] = useState(false);
  const [startRentalAssetId, setStartRentalAssetId] = useState<string>("");
  const [showReturnModal, setShowReturnModal] = useState<RentalAgreementRow | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<RentalAgreementRow | null>(null);
  const [showTransferUdhaarModal, setShowTransferUdhaarModal] = useState<RentalAgreementRow | null>(null);

  const assets = shop.data.assets || [];
  const agreements = shop.data.agreements || [];
  const payments = shop.data.rentalPayments || [];
  const customers = shop.data.customers || [];

  // Summary calculations
  const summary = useMemo(
    () => computeShopRentalsSummary(assets, agreements, payments),
    [assets, agreements, payments],
  );

  // Filtered assets
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (q && !asset.name.toLowerCase().includes(q) && !(asset.description ?? "").toLowerCase().includes(q)) {
        return false;
      }
      if (statusFilter === "all") return true;
      if (statusFilter === "available") return asset.status === "available";
      if (statusFilter === "maintenance") return asset.status === "maintenance";
      if (statusFilter === "rented") return asset.status === "rented";
      if (statusFilter === "overdue") {
        const ag = agreements.find((a) => a.asset_id === asset.id && a.status !== "ended");
        if (!ag) return false;
        const fin = computeAgreementFinancials(ag, payments.filter((p) => p.agreement_id === ag.id));
        return fin.overdue;
      }
      return true;
    });
  }, [assets, agreements, payments, search, statusFilter]);

  if (activeTab === "expense") {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-white px-4 py-2">
          <div className="mx-auto flex max-w-6xl gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#616161] hover:bg-[#f6f6f7]"
              onClick={() => setActiveTab("income")}
            >
              {shop.text("kiraya_mila_tab")}
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#1a1c1e] px-4 py-2 text-sm font-medium text-white"
              onClick={() => setActiveTab("expense")}
            >
              {shop.text("kiraya_diya_tab")}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <RecordBook kind="rent" />
        </div>
      </div>
    );
  }

  return (
    <main className="h-full overflow-y-auto bg-[#f6f6f7]">
      <div className="border-b border-border bg-white px-4 py-2">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg bg-[#1a1c1e] px-4 py-2 text-sm font-medium text-white"
              onClick={() => setActiveTab("income")}
            >
              {shop.text("kiraya_mila_tab")}
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#616161] hover:bg-[#f6f6f7]"
              onClick={() => setActiveTab("expense")}
            >
              {shop.text("kiraya_diya_tab")}
            </button>
          </div>
          <a
            href="/api/export?book=rentals"
            download
            className="btn btn-secondary hidden h-9 items-center gap-1.5 text-xs sm:inline-flex"
          >
            <Download size={14} /> {shop.text("export_csv")}
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <PageHeader
          title={shop.text("rentals_title")}
          subtitle={shop.text("rentals_sub")}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddAsset(true)}
              >
                <Plus size={16} /> {shop.text("add_asset")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setStartRentalAssetId("");
                  setShowStartRental(true);
                }}
              >
                <KeyRound size={16} /> {shop.text("start_rental")}
              </button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">{shop.text("expected_this_month")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#1a1c1e]">{formatRupees(summary.expectedThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">{shop.text("collected_this_month")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#1f6b45]">{formatRupees(summary.collectedThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">{shop.text("pending_this_month")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#8f3d32]">{formatRupees(summary.pendingThisMonth)}</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-3.5 shadow-sm">
            <p className="text-xs font-medium text-[#616161]">{shop.text("overdue_count")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#b45309]">{summary.overdueAgreementsCount}</p>
          </div>
          <div className="col-span-2 rounded-xl border border-border bg-white p-3.5 shadow-sm sm:col-span-1">
            <p className="text-xs font-medium text-[#616161]">{shop.text("deposits_held")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-[#2563eb]">{formatRupees(summary.depositsHeld)}</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            className="field w-full sm:w-64"
            placeholder={shop.text("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex overflow-x-auto pb-1 sm:pb-0">
            {(["all", "available", "rented", "overdue", "maintenance"] as const).map((st) => (
              <button
                key={st}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap ${
                  statusFilter === st ? "bg-[#1a1c1e] text-white" : "text-[#616161] hover:bg-white"
                }`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "all"
                  ? shop.text("all")
                  : st === "available"
                    ? shop.text("status_available")
                    : st === "rented"
                      ? shop.text("status_rented")
                      : st === "overdue"
                        ? shop.text("status_overdue")
                        : shop.text("status_maintenance")}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Cards Grid */}
        {filteredAssets.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-10 text-center">
            <Building2 className="mx-auto text-[#616161]" size={36} />
            <p className="mt-3 text-base font-semibold text-[#1a1c1e]">Koi rental asset nahi mila</p>
            <p className="mt-1 text-sm text-[#616161]">Dukaan, kamra, ya chakki kiraye par dene ke liye jodo.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddAsset(true)}
              >
                <Plus size={16} /> {shop.text("add_asset")}
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map((asset) => {
              const activeAgreement = agreements.find((a) => a.asset_id === asset.id && a.status !== "ended");
              const tenant = activeAgreement ? customers.find((c) => c.id === activeAgreement.customer_id) : null;
              const fin = activeAgreement
                ? computeAgreementFinancials(
                    activeAgreement,
                    payments.filter((p) => p.agreement_id === activeAgreement.id),
                  )
                : null;

              return (
                <div
                  key={asset.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-[#1a1c1e]/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold tracking-wider text-[#8d5a2b] uppercase">
                          {asset.type === "property" ? "Property" : asset.type === "equipment" ? "Equipment" : "Other"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-bold text-[#1a1c1e]">{asset.name}</h3>
                          {Boolean(asset.is_sample) ? <SampleTag /> : null}
                        </div>
                      </div>
                      <Badge
                        tone={
                          asset.status === "available"
                            ? "paid"
                            : fin?.overdue
                              ? "warning"
                              : asset.status === "rented"
                                ? "due"
                                : "neutral"
                        }
                      >
                        {fin?.overdue
                          ? `${fin.overdueDays} ${shop.text("days_overdue")}`
                          : asset.status === "available"
                            ? shop.text("status_available")
                            : asset.status === "rented"
                              ? shop.text("status_rented")
                              : shop.text("status_maintenance")}
                      </Badge>
                    </div>

                    {asset.description ? (
                      <p className="mt-1 text-xs text-[#616161]">{asset.description}</p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                      <span className="text-[#616161]">Rate:</span>
                      <span className="font-semibold tabular-nums text-[#1a1c1e]">
                        {formatRupees(asset.rate_amount)} / {asset.rate_period.replace("per_", "")}
                      </span>
                    </div>

                    {asset.security_deposit_amount > 0 ? (
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-[#616161]">{shop.text("security_deposit")}:</span>
                        <span className="font-medium tabular-nums text-[#2563eb]">
                          {formatRupees(asset.security_deposit_amount)}
                        </span>
                      </div>
                    ) : null}

                    {/* Active Tenant Section */}
                    {activeAgreement && tenant ? (
                      <div className="mt-3 rounded-lg bg-[#f8f9fa] p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-semibold text-[#1a1c1e]">
                            {tenant.name}
                            {Boolean(activeAgreement.is_sample) ? <SampleTag /> : null}
                          </span>
                          <span className="tabular-nums text-[#616161]">{formatPhone(tenant.phone ?? undefined)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[#616161]">
                          <span>Kul Kiraya:</span>
                          <span className="font-medium text-[#1a1c1e]">{formatRupees(fin?.totalDue ?? 0)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[#616161]">
                          <span>Mila / Baaki:</span>
                          <span>
                            <strong className="text-[#1f6b45]">{formatRupees(fin?.totalPaid ?? 0)}</strong> /{" "}
                            <strong className={fin && fin.pending > 0 ? "text-[#8f3d32]" : "text-[#1a1c1e]"}>
                              {formatRupees(fin?.pending ?? 0)}
                            </strong>
                          </span>
                        </div>
                        {fin && fin.overdue && tenant.phone ? (
                          <div className="mt-2 flex gap-1">
                            <a
                              href={`https://wa.me/91${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                `Namaste ${tenant.name} ji, aapka ${asset.name} ka kiraya ₹${fin.pending} baaki hai. Kripya jama kar dijiye. - ${shop.data.shop.name}`,
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary h-7 flex-1 text-[11px]"
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                            <a
                              href={`sms:+91${tenant.phone.replace(/\D/g, "")}?body=${encodeURIComponent(
                                `Namaste ${tenant.name} ji, aapka ${asset.name} ka kiraya ₹${fin.pending} baaki hai. - ${shop.data.shop.name}`,
                              )}`}
                              className="btn btn-secondary h-7 flex-1 text-[11px]"
                            >
                              SMS
                            </a>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex gap-1.5 border-t border-border pt-3">
                    {activeAgreement ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary h-8 flex-1 text-xs"
                          onClick={() => setShowPaymentModal(activeAgreement)}
                        >
                          {shop.text("collect_rent")}
                        </button>
                        {asset.type === "equipment" ? (
                          <button
                            type="button"
                            className="btn btn-secondary h-8 text-xs"
                            onClick={() => setShowReturnModal(activeAgreement)}
                          >
                            <RotateCcw size={13} /> {shop.text("return_rental")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-secondary h-8 px-2 text-xs"
                          onClick={() => setSelectedAsset(asset)}
                          title="Details"
                        >
                          Details
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary h-8 flex-1 text-xs"
                          onClick={() => {
                            setStartRentalAssetId(asset.id);
                            setShowStartRental(true);
                          }}
                        >
                          <KeyRound size={13} /> {shop.text("start_rental")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary h-8 px-2 text-xs"
                          onClick={() => setSelectedAsset(asset)}
                        >
                          Details
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Asset Detail Drawer / Modal */}
      {selectedAsset ? (
        <AssetDetailModal
          asset={selectedAsset}
          agreements={agreements.filter((a) => a.asset_id === selectedAsset.id)}
          payments={payments.filter((p) => p.asset_id === selectedAsset.id)}
          customers={customers}
          onClose={() => setSelectedAsset(null)}
          onStartRental={() => {
            setStartRentalAssetId(selectedAsset.id);
            setSelectedAsset(null);
            setShowStartRental(true);
          }}
          onCollectRent={(ag) => {
            setSelectedAsset(null);
            setShowPaymentModal(ag);
          }}
          onReturn={(ag) => {
            setSelectedAsset(null);
            setShowReturnModal(ag);
          }}
          onTransferUdhaar={(ag) => {
            setSelectedAsset(null);
            setShowTransferUdhaarModal(ag);
          }}
        />
      ) : null}

      {/* Add Asset Modal */}
      {showAddAsset ? (
        <AddAssetModal
          onClose={() => setShowAddAsset(false)}
          onSaved={async () => {
            setShowAddAsset(false);
            await shop.reload();
          }}
        />
      ) : null}

      {/* Start Rental Modal */}
      {showStartRental ? (
        <StartRentalModal
          initialAssetId={startRentalAssetId}
          assets={assets}
          customers={customers}
          onClose={() => setShowStartRental(false)}
          onSaved={async () => {
            setShowStartRental(false);
            await shop.reload();
          }}
        />
      ) : null}

      {/* Collect Rent Modal */}
      {showPaymentModal ? (
        <CollectRentModal
          agreement={showPaymentModal}
          asset={assets.find((a) => a.id === showPaymentModal.asset_id)}
          customer={customers.find((c) => c.id === showPaymentModal.customer_id)}
          onClose={() => setShowPaymentModal(null)}
          onSaved={async () => {
            setShowPaymentModal(null);
            await shop.reload();
          }}
        />
      ) : null}

      {/* Return Equipment Modal */}
      {showReturnModal ? (
        <ReturnEquipmentModal
          agreement={showReturnModal}
          asset={assets.find((a) => a.id === showReturnModal.asset_id)}
          customer={customers.find((c) => c.id === showReturnModal.customer_id)}
          onClose={() => setShowReturnModal(null)}
          onSaved={async () => {
            setShowReturnModal(null);
            await shop.reload();
          }}
        />
      ) : null}

      {/* Transfer Unpaid Rent to Udhaar Modal */}
      {showTransferUdhaarModal ? (
        <TransferUdhaarModal
          agreement={showTransferUdhaarModal}
          asset={assets.find((a) => a.id === showTransferUdhaarModal.asset_id)}
          customer={customers.find((c) => c.id === showTransferUdhaarModal.customer_id)}
          payments={payments.filter((p) => p.agreement_id === showTransferUdhaarModal.id)}
          onClose={() => setShowTransferUdhaarModal(null)}
          onSaved={async () => {
            setShowTransferUdhaarModal(null);
            await shop.reload();
          }}
        />
      ) : null}
    </main>
  );
}

// ----------------- MODAL COMPONENTS -----------------

function AddAssetModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => Promise<void> }) {
  const shop = useShop();
  const [name, setName] = useState("");
  const [type, setType] = useState<"property" | "equipment" | "other">("property");
  const [description, setDescription] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [ratePeriod, setRatePeriod] = useState<"per_day" | "per_week" | "per_month" | "one_time">("per_month");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Asset ka naam likho.");
      return;
    }
    const amt = wholeRupees(rateAmount);
    if (!amt || amt <= 0) {
      setError("Sahi rate amount likho.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rentals/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || undefined,
          rateAmount: amt,
          ratePeriod,
          securityDepositAmount: wholeRupees(securityDeposit) ?? 0,
          notes: notes.trim() || undefined,
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
    <Modal title={shop.text("add_asset")} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <label className="lbl">
          {shop.text("asset_name")} *
          <input className="field mt-1" placeholder="e.g. Kamra 1, Atta Chakki" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="lbl">
          {shop.text("asset_type")}
          <select className="field mt-1" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="property">{shop.text("type_property")}</option>
            <option value="equipment">{shop.text("type_equipment")}</option>
            <option value="other">{shop.text("type_other")}</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("rate_amount")} *
            <input className="field mt-1" inputMode="numeric" placeholder="₹5,000" value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("rate_period")}
            <select className="field mt-1" value={ratePeriod} onChange={(e) => setRatePeriod(e.target.value as any)}>
              <option value="per_month">{shop.text("per_month")}</option>
              <option value="per_day">{shop.text("per_day")}</option>
              <option value="per_week">{shop.text("per_week")}</option>
              <option value="one_time">{shop.text("one_time")}</option>
            </select>
          </label>
        </div>
        <label className="lbl">
          {shop.text("security_deposit")}
          <input className="field mt-1" inputMode="numeric" placeholder="₹0" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value)} />
        </label>
        <label className="lbl">
          Location / Description
          <input className="field mt-1" placeholder="e.g. 1st floor, street 2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="lbl">
          {shop.text("note")}
          <input className="field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={handleSave}>
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

function StartRentalModal({
  initialAssetId,
  assets,
  customers,
  onClose,
  onSaved,
}: {
  initialAssetId: string;
  assets: RentalAssetRow[];
  customers: { id: string; name: string; phone: string | null }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const shop = useShop();
  const [assetId, setAssetId] = useState(initialAssetId || (assets[0]?.id ?? ""));
  const [customerId, setCustomerId] = useState("");
  const [renterName, setRenterName] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [ratePeriod, setRatePeriod] = useState<"per_day" | "per_week" | "per_month" | "one_time">("per_month");
  const [depositAmount, setDepositAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.id === assetId);

  // Sync rate and period from selected asset
  useState(() => {
    if (selectedAsset) {
      setRateAmount(String(selectedAsset.rate_amount));
      setRatePeriod(selectedAsset.rate_period);
      setDepositAmount(String(selectedAsset.security_deposit_amount));
    }
  });

  async function handleSave() {
    if (!assetId) {
      setError("Asset chuno.");
      return;
    }
    const finalName = renterName.trim() || customers.find((c) => c.id === customerId)?.name || "";
    const finalPhone = renterPhone.trim() || customers.find((c) => c.id === customerId)?.phone || "";
    if (finalName.length < 2) {
      setError("Kirayedaar ka naam likho.");
      return;
    }
    if (finalPhone.replace(/\D/g, "").length !== 10) {
      setError("Kirayedaar ka 10 digit phone zaroori hai.");
      return;
    }
    const rate = wholeRupees(rateAmount);
    if (!rate || rate <= 0) {
      setError("Sahi rate amount likho.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rentals/agreements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          customerId: customerId || undefined,
          name: finalName,
          phone: finalPhone,
          startDate,
          expectedEndDate: expectedEndDate || undefined,
          rateAmount: rate,
          ratePeriod,
          depositAmount: wholeRupees(depositAmount) ?? 0,
          dueDay: Number(dueDay) || 1,
          notes: notes.trim() || undefined,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Agreement save nahi hua.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={shop.text("start_rental")} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <label className="lbl">
          {shop.text("asset_name")} *
          <select
            className="field mt-1"
            value={assetId}
            onChange={(e) => {
              const aid = e.target.value;
              setAssetId(aid);
              const a = assets.find((x) => x.id === aid);
              if (a) {
                setRateAmount(String(a.rate_amount));
                setRatePeriod(a.rate_period);
                setDepositAmount(String(a.security_deposit_amount));
              }
            }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type}) - {formatRupees(a.rate_amount)}/{a.rate_period.replace("per_", "")}
              </option>
            ))}
          </select>
        </label>

        <div>
          <label className="lbl">Kirayedaar (Pehle se grahak hai to chuno)</label>
          <select
            className="field mt-1"
            value={customerId}
            onChange={(e) => {
              const cid = e.target.value;
              setCustomerId(cid);
              const c = customers.find((x) => x.id === cid);
              if (c) {
                setRenterName(c.name);
                setRenterPhone(c.phone ?? "");
              }
            }}
          >
            <option value="">-- Naya Kirayedaar Ya List Se Chuno --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone || "phone nahi"})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("field_name")} *
            <input className="field mt-1" value={renterName} onChange={(e) => setRenterName(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("phone")} (10 digit) *
            <input className="field mt-1" inputMode="numeric" placeholder="90000 11111" value={renterPhone} onChange={(e) => setRenterPhone(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            Start Date *
            <input type="date" className="field mt-1" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("expected_return")}
            <input type="date" className="field mt-1" value={expectedEndDate} onChange={(e) => setExpectedEndDate(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("rate_amount")} *
            <input className="field mt-1" inputMode="numeric" value={rateAmount} onChange={(e) => setRateAmount(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("rate_period")}
            <select className="field mt-1" value={ratePeriod} onChange={(e) => setRatePeriod(e.target.value as any)}>
              <option value="per_month">{shop.text("per_month")}</option>
              <option value="per_day">{shop.text("per_day")}</option>
              <option value="per_week">{shop.text("per_week")}</option>
              <option value="one_time">{shop.text("one_time")}</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("security_deposit")}
            <input className="field mt-1" inputMode="numeric" placeholder="₹0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("due_day")}
            <input className="field mt-1" inputMode="numeric" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
          </label>
        </div>

        <label className="lbl">
          {shop.text("note")}
          <input className="field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={handleSave}>
            {saving ? "…" : shop.text("confirm")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {shop.text("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CollectRentModal({
  agreement,
  asset,
  customer,
  onClose,
  onSaved,
}: {
  agreement: RentalAgreementRow;
  asset?: RentalAssetRow;
  customer?: { id: string; name: string; phone: string | null };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const shop = useShop();
  const [amount, setAmount] = useState(String(agreement.rate_amount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"cash" | "UPI" | "other">("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const amt = wholeRupees(amount);
    if (!amt || amt <= 0) {
      setError("Sahi amount likho.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rentals/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: agreement.id,
          customerId: agreement.customer_id,
          assetId: agreement.asset_id,
          amount: amt,
          paymentDate: date,
          mode,
          note: note.trim() || undefined,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Payment save nahi hua.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={shop.text("collect_rent")} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <div className="rounded-lg bg-[#f8f9fa] p-3 text-sm">
          <p className="font-semibold">{asset?.name ?? "Asset"}</p>
          <p className="text-[#616161]">{customer?.name ?? "Kirayedaar"} ({formatPhone(customer?.phone ?? undefined)})</p>
        </div>
        <label className="lbl">
          {shop.text("amount")} *
          <input className="field mt-1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            Payment Date
            <input type="date" className="field mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="lbl">
            Mode
            <select className="field mt-1" value={mode} onChange={(e) => setMode(e.target.value as any)}>
              <option value="cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <label className="lbl">
          {shop.text("note")}
          <input className="field mt-1" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={handleSave}>
            {saving ? "…" : shop.text("confirm")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {shop.text("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReturnEquipmentModal({
  agreement,
  asset,
  customer,
  onClose,
  onSaved,
}: {
  agreement: RentalAgreementRow;
  asset?: RentalAssetRow;
  customer?: { id: string; name: string; phone: string | null };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const shop = useShop();
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [deductions, setDeductions] = useState("0");
  const [deductionReason, setDeductionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute calculated rental cost
  const calculation = useMemo(() => {
    return computeEquipmentRentalCost({
      startDate: agreement.start_date,
      actualEndDate: returnDate,
      expectedEndDate: agreement.expected_end_date,
      rateAmount: agreement.rate_amount,
      ratePeriod: agreement.rate_period,
      depositAmount: agreement.deposit_amount,
      deductions: Number(deductions) || 0,
    });
  }, [agreement, returnDate, deductions]);

  async function handleReturn() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/rentals/agreements/${agreement.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnDate,
          deductions: wholeRupees(deductions) ?? 0,
          deductionReason: deductionReason.trim() || undefined,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Wapas nahi ho paya.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`${shop.text("return_rental")} — ${asset?.name ?? "Equipment"}`} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <div className="rounded-lg bg-[#f8f9fa] p-3 text-xs space-y-1">
          <p className="font-semibold text-sm">{customer?.name ?? "Kirayedaar"}</p>
          <p className="text-[#616161]">Diya tha: {agreement.start_date}</p>
          {agreement.expected_end_date ? <p className="text-[#616161]">Wapsi expect: {agreement.expected_end_date}</p> : null}
          <div className="mt-2 border-t border-border pt-1">
            <p>Kul Din: <strong>{calculation.daysUsed} din</strong> {calculation.lateDays > 0 ? <span className="text-[#8f3d32]">({calculation.lateDays} din late)</span> : null}</p>
            <p>Kiraya Amount: <strong>{formatRupees(calculation.rentalCharge)}</strong></p>
            <p>Suraksha Deposit: <strong>{formatRupees(agreement.deposit_amount)}</strong></p>
            <p className="text-[#1f6b45]">Wapas karne yogya deposit: <strong>{formatRupees(calculation.depositToRefund)}</strong></p>
          </div>
        </div>

        <label className="lbl">
          {shop.text("return_date")}
          <input type="date" className="field mt-1" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="lbl">
            {shop.text("deductions")} (Deposit se)
            <input className="field mt-1" inputMode="numeric" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("deduction_reason")}
            <input className="field mt-1" placeholder="Damage / delay" value={deductionReason} onChange={(e) => setDeductionReason(e.target.value)} />
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving} onClick={handleReturn}>
            {saving ? "…" : shop.text("confirm")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {shop.text("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TransferUdhaarModal({
  agreement,
  asset,
  customer,
  payments,
  onClose,
  onSaved,
}: {
  agreement: RentalAgreementRow;
  asset?: RentalAssetRow;
  customer?: { id: string; name: string; phone: string | null };
  payments: RentalPaymentRow[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const shop = useShop();
  const fin = computeAgreementFinancials(agreement, payments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTransfer() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/rentals/convert-to-udhaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreementId: agreement.id,
          amount: fin.pending,
          note: `Kiraya transfer: ${asset?.name ?? "Asset"}`,
          confirmed: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Transfer nahi hua.");
        return;
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={shop.text("transfer_to_udhaar")} onClose={onClose}>
      <div className="space-y-3">
        {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
        <p className="text-sm text-[#1a1c1e]">{shop.text("transfer_to_udhaar_confirm")}</p>
        <div className="rounded-lg bg-[#f8f9fa] p-3 text-sm">
          <p>Kirayedaar: <strong>{customer?.name}</strong></p>
          <p>Asset: <strong>{asset?.name}</strong></p>
          <p>Baaki Kiraya: <strong className="text-[#8f3d32]">{formatRupees(fin.pending)}</strong></p>
        </div>
        <p className="text-xs text-[#616161]">
          Yeh action {customer?.name} ke Udhaar ledger mein ₹{fin.pending} jod dega aur kiraya ledger se pending balance clear karega.
        </p>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn btn-primary flex-1" disabled={saving || fin.pending <= 0} onClick={handleTransfer}>
            {saving ? "…" : "Haan, Udhaar Mein Jodo"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {shop.text("cancel")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssetDetailModal({
  asset,
  agreements,
  payments,
  customers,
  onClose,
  onStartRental,
  onCollectRent,
  onReturn,
  onTransferUdhaar,
}: {
  asset: RentalAssetRow;
  agreements: RentalAgreementRow[];
  payments: RentalPaymentRow[];
  customers: { id: string; name: string; phone: string | null }[];
  onClose: () => void;
  onStartRental: () => void;
  onCollectRent: (ag: RentalAgreementRow) => void;
  onReturn: (ag: RentalAgreementRow) => void;
  onTransferUdhaar: (ag: RentalAgreementRow) => void;
}) {
  const shop = useShop();
  const activeAgreement = agreements.find((a) => a.status !== "ended");
  const tenant = activeAgreement ? customers.find((c) => c.id === activeAgreement.customer_id) : null;
  const fin = activeAgreement ? computeAgreementFinancials(activeAgreement, payments.filter((p) => p.agreement_id === activeAgreement.id)) : null;

  return (
    <Modal title={`Asset Detail — ${asset.name}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Asset summary */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-[#1a1c1e]">{asset.name}</h3>
            <p className="text-xs text-[#616161]">{asset.description || "Koi description nahi"}</p>
          </div>
          <Badge tone={asset.status === "available" ? "paid" : asset.status === "rented" ? "due" : "neutral"}>
            {asset.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-[#f8f9fa] p-2.5">
            <span className="text-[#616161]">Rate:</span>
            <p className="font-semibold">{formatRupees(asset.rate_amount)} / {asset.rate_period.replace("per_", "")}</p>
          </div>
          <div className="rounded-lg bg-[#f8f9fa] p-2.5">
            <span className="text-[#616161]">Deposit:</span>
            <p className="font-semibold">{formatRupees(asset.security_deposit_amount)}</p>
          </div>
        </div>

        {/* Active agreement */}
        {activeAgreement && tenant && fin ? (
          <div className="rounded-xl border border-border p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8d5a2b] uppercase">Current Renter</span>
              {fin.overdue ? <Badge tone="warning">{fin.overdueDays} din overdue</Badge> : <Badge tone="paid">Active</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm text-[#1a1c1e]">{tenant.name}</p>
              <p className="text-xs tabular-nums text-[#616161]">{formatPhone(tenant.phone ?? undefined)}</p>
            </div>
            <div className="grid grid-cols-3 gap-1 border-t border-border pt-2 text-center text-xs">
              <div>
                <span className="text-[#616161]">Expected</span>
                <p className="font-bold tabular-nums">{formatRupees(fin.totalDue)}</p>
              </div>
              <div>
                <span className="text-[#616161]">Collected</span>
                <p className="font-bold tabular-nums text-[#1f6b45]">{formatRupees(fin.totalPaid)}</p>
              </div>
              <div>
                <span className="text-[#616161]">Pending</span>
                <p className="font-bold tabular-nums text-[#8f3d32]">{formatRupees(fin.pending)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              <button
                type="button"
                className="btn btn-primary h-8 flex-1 text-xs"
                onClick={() => onCollectRent(activeAgreement)}
              >
                Kiraya Jama Karo
              </button>
              {asset.type === "equipment" ? (
                <button
                  type="button"
                  className="btn btn-secondary h-8 text-xs"
                  onClick={() => onReturn(activeAgreement)}
                >
                  Wapas Lo
                </button>
              ) : null}
              {fin.pending > 0 ? (
                <button
                  type="button"
                  className="btn btn-secondary h-8 text-xs"
                  onClick={() => onTransferUdhaar(activeAgreement)}
                >
                  Udhaar Mein Daalo
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-[#616161]">Abhi koi kiraye par nahi hai.</p>
            <button type="button" className="btn btn-primary mt-2 text-xs" onClick={onStartRental}>
              Kiraye Par Do
            </button>
          </div>
        )}

        {/* Payment history */}
        <div>
          <h4 className="text-xs font-semibold text-[#616161] uppercase tracking-wider mb-2">Rent Payment History</h4>
          {payments.length === 0 ? (
            <p className="text-xs text-[#616161]">Abhi koi payment record nahi hai.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-[#f8f9fa] px-3 py-2 text-xs">
                  <div>
                    <span className="font-semibold text-[#1a1c1e]">{formatRupees(p.amount)}</span>
                    <span className="ml-2 text-[#616161]">({p.mode})</span>
                    {p.note ? <p className="text-[11px] text-[#616161]">{p.note}</p> : null}
                  </div>
                  <span className="tabular-nums text-[#616161]">{p.payment_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
