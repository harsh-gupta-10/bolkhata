"use client";

import { useState } from "react";
import { useShop } from "@/components/shop-provider";
import { SampleTag } from "@/components/ui-bits";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface SampleCounts {
  hasSample: boolean;
  customers: number;
  entries: number;
  records: number;
  assets: number;
  agreements: number;
  purchases: number;
  total: number;
}

export function computeSampleStats(shop: ReturnType<typeof useShop>): SampleCounts {
  const data = shop.data;
  if (!data) {
    return {
      hasSample: false,
      customers: 0,
      entries: 0,
      records: 0,
      assets: 0,
      agreements: 0,
      purchases: 0,
      total: 0,
    };
  }

  const customers = (data.customers || []).filter(
    (c) => Boolean(c.is_sample) || (c.phone && c.phone.replace(/\D/g, "").startsWith("90000")),
  ).length;
  const entries = (data.entries || []).filter(
    (e) => Boolean(e.is_sample) || (e.customer_phone && e.customer_phone.replace(/\D/g, "").startsWith("90000")),
  ).length;
  const records = (data.records || []).filter((r) => Boolean(r.is_sample)).length;
  const assets = (data.assets || []).filter((a) => Boolean(a.is_sample)).length;
  const agreements = (data.agreements || []).filter((ag) => Boolean(ag.is_sample)).length;
  const purchases = (data.purchases || []).filter((p) => Boolean(p.is_sample)).length;
  const total = customers + entries + records + assets + agreements + purchases;

  return {
    hasSample: total > 0,
    customers,
    entries,
    records,
    assets,
    agreements,
    purchases,
    total,
  };
}

/**
 * Reusable modal for confirming removal of all dummy sample data to go live.
 */
export function SampleRemoveModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const shop = useShop();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sample", { method: "DELETE" });
      if (res.ok) {
        onOpenChange(false);
        await shop.reload();
        if (onSuccess) onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-100 text-red-700 text-base">🗑️</span>
            <DialogTitle className="text-base font-bold text-[#1a1c1e]">
              {shop.text("sample_remove_confirm_title")}
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-xs leading-relaxed text-[#616161]">
            {shop.text("sample_remove_confirm_desc")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:gap-2">
          <button
            type="button"
            disabled={loading}
            className="btn btn-secondary h-9 px-3 text-xs"
            onClick={() => onOpenChange(false)}
          >
            {shop.text("sample_remove_cancel")}
          </button>
          <button
            type="button"
            disabled={loading}
            className="btn bg-red-600 hover:bg-red-700 text-white font-semibold h-9 px-3.5 text-xs shadow-sm"
            onClick={handleConfirm}
          >
            {loading ? "..." : shop.text("sample_remove_confirm_btn")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Global notice banner rendered right below header across every page.
 */
export function SampleGlobalBanner() {
  const shop = useShop();
  const [loading, setLoading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const stats = computeSampleStats(shop);

  const isEmptyShop =
    !stats.hasSample &&
    (shop.data.customers?.length ?? 0) === 0 &&
    (shop.data.entries?.length ?? 0) === 0;

  const handleLoad = async () => {
    setLoading(true);
    try {
      await fetch("/api/sample", { method: "POST" });
      await shop.reload();
    } finally {
      setLoading(false);
    }
  };

  if (stats.hasSample) {
    return (
      <>
        <div className="border-b border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 sm:px-4">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 font-bold">🧪</span>
              <span className="font-semibold shrink-0">{shop.text("demo_mode_badge")}:</span>
              <span className="truncate text-amber-900 hidden sm:inline">
                {shop.text("demo_banner_active")}
              </span>
              <span className="truncate text-amber-900 sm:hidden">
                Sample data active ({stats.total} items)
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={loading}
                className="rounded-md border border-red-300 bg-white px-2.5 py-1 text-[11px] font-bold text-red-600 shadow-xs hover:bg-red-50 hover:border-red-400"
                onClick={() => setShowRemoveModal(true)}
              >
                🗑️ {shop.text("remove_dummy_data")}
              </button>
              <button
                type="button"
                disabled={loading}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-900 shadow-xs hover:bg-amber-100 hidden md:inline"
                onClick={handleLoad}
              >
                {loading ? "..." : `🔄 ${shop.text("reload_dummy_data")}`}
              </button>
            </div>
          </div>
        </div>

        <SampleRemoveModal open={showRemoveModal} onOpenChange={setShowRemoveModal} />
      </>
    );
  }

  if (isEmptyShop) {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-950 sm:px-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">✨</span>
            <span className="font-medium text-emerald-900">{shop.text("demo_banner_empty")}</span>
          </div>
          <button
            type="button"
            disabled={loading}
            className="rounded-md bg-[#1f6b45] px-3 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#185336]"
            onClick={handleLoad}
          >
            {loading ? "..." : `+ ${shop.text("load_dummy_data")}`}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Dedicated Card for the Home page dashboard.
 */
export function SampleHomeCard() {
  const shop = useShop();
  const [loading, setLoading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const stats = computeSampleStats(shop);

  const handleLoad = async () => {
    setLoading(true);
    try {
      await fetch("/api/sample", { method: "POST" });
      await shop.reload();
    } finally {
      setLoading(false);
    }
  };

  if (stats.hasSample) {
    return (
      <>
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/70 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-200/80 text-lg">
                🧪
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-amber-950">
                    {shop.text("dummy_data_title")}
                  </h2>
                  <SampleTag text={shop.text("demo_mode_badge")} />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-amber-900 max-w-2xl">
                  {shop.text("dummy_data_desc_active")}
                </p>

                {/* Counts breakdown */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-amber-900">
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.customers} Grahak
                  </span>
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.entries} Khata Lines
                  </span>
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.records} Bills / Rent
                  </span>
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.assets} Rental Assets
                  </span>
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.agreements} Agreements
                  </span>
                  <span className="rounded-md bg-white/80 border border-amber-200/60 px-2 py-0.5 font-medium">
                    {stats.purchases} Suppliers
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                className="btn bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-3.5 text-xs shadow-sm"
                onClick={() => setShowRemoveModal(true)}
              >
                🗑️ {shop.text("remove_dummy_data")}
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-medium h-9 px-3 text-xs shadow-xs"
                onClick={handleLoad}
              >
                {loading ? "..." : `🔄 ${shop.text("reload_dummy_data")}`}
              </button>
            </div>
          </div>
        </div>

        <SampleRemoveModal open={showRemoveModal} onOpenChange={setShowRemoveModal} />
      </>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f5ee] text-lg text-[#1f6b45]">
            💡
          </span>
          <div>
            <h2 className="text-base font-bold text-[#1a1c1e]">{shop.text("dummy_data_title")}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#616161] max-w-xl">
              {shop.text("dummy_data_desc_empty")}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          className="btn btn-secondary font-semibold h-9 px-4 text-xs"
          onClick={handleLoad}
        >
          {loading ? "..." : `+ ${shop.text("load_dummy_data")}`}
        </button>
      </div>
    </div>
  );
}
