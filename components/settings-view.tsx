"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShop } from "@/components/shop-provider";
import { leaveShop } from "@/lib/firebase-client";
import { SampleTag } from "@/components/ui-bits";

export function SettingsView() {
  const shop = useShop();
  const router = useRouter();
  const profile = shop.data.shop;
  const [name, setName] = useState(profile.name);
  const [owner, setOwner] = useState(profile.owner_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [note, setNote] = useState("");

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-xl px-4 py-5 md:px-6">
        <h1 className="text-xl font-semibold">{shop.text("nav_settings")}</h1>
        <p className="mt-1 text-sm text-[#616161]">{shop.text("settings_intro")}</p>

        {/* Dummy / Sample Data Management (High Visibility) */}
        <SampleSection note={note} setNote={setNote} />

        <form
          className="mt-5 space-y-3 rounded-xl border border-border bg-white p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const response = await fetch("/api/shop", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, ownerName: owner, phone }),
            });
            if (!response.ok) {
              setNote("Profile save nahi hua.");
              return;
            }
            setNote("Save ho gaya.");
            await shop.reload();
          }}
        >
          <label className="lbl">
            {shop.text("field_shop")}
            <input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="lbl">
            {shop.text("field_owner")}
            <input className="field mt-1" value={owner} onChange={(event) => setOwner(event.target.value)} />
          </label>
          <label className="lbl">
            Email
            <input className="field mt-1" value={profile.email} readOnly />
          </label>
          <label className="lbl">
            {shop.text("field_phone")}
            <input className="field mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>

        <section className="mt-4 rounded-xl border border-border bg-white p-4">
          <h2 className="text-sm font-semibold">{shop.text("lang_title")}</h2>
          <p className="mt-1 text-sm leading-6 text-[#616161]">{shop.text("lang_help")}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={`btn ${shop.locale === "hinglish" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => void shop.setLocale("hinglish")}
            >
              Hinglish
            </button>
            <button
              type="button"
              className={`btn ${shop.locale === "en" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => void shop.setLocale("en")}
            >
              English
            </button>
          </div>
        </section>

        <button
          type="button"
          className="btn btn-secondary mt-6"
          onClick={async () => {
            await leaveShop();
            router.push("/");
          }}
        >
          {shop.text("sign_out")}
        </button>
      </div>
    </main>
  );
}

function SampleSection({ note, setNote }: { note: string; setNote: (value: string) => void }) {
  const shop = useShop();
  const [loading, setLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const sampleCustomers = shop.data.customers.filter((c) => Boolean(c.is_sample) || (c.phone && c.phone.replace(/\D/g, "").startsWith("90000")));
  const sampleEntries = shop.data.entries.filter((e) => Boolean(e.is_sample) || (e.customer_phone && e.customer_phone.replace(/\D/g, "").startsWith("90000")));
  const sampleRecords = shop.data.records.filter((r) => Boolean(r.is_sample));
  const sampleAssets = (shop.data.assets || []).filter((a) => Boolean(a.is_sample));
  const sampleAgreements = (shop.data.agreements || []).filter((ag) => Boolean(ag.is_sample));
  const samplePurchases = (shop.data.purchases || []).filter((p) => Boolean(p.is_sample));

  const hasSample =
    sampleCustomers.length > 0 ||
    sampleEntries.length > 0 ||
    sampleRecords.length > 0 ||
    sampleAssets.length > 0 ||
    sampleAgreements.length > 0 ||
    samplePurchases.length > 0;

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sample", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { already?: boolean };
      setNote(body.already ? shop.text("sample_done") : shop.text("sample_yes"));
      await shop.reload();
    } catch {
      setNote("Sample data load nahi ho paya.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSample = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sample", { method: "DELETE" });
      if (response.ok) {
        setNote(shop.text("sample_removed_toast"));
        setConfirmRemove(false);
        await shop.reload();
      } else {
        setNote("Sample data nahi hat paya.");
      }
    } catch {
      setNote("Sample data nahi hat paya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`mt-4 rounded-xl border p-4 shadow-sm ${hasSample ? "border-amber-300 bg-amber-50/50" : "border-border bg-white"}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">{hasSample ? "🧪" : "💡"}</span>
          <h2 className="text-sm font-bold text-[#1a1c1e]">{shop.text("dummy_data_title")}</h2>
        </div>
        {hasSample ? <SampleTag text={shop.text("demo_mode_badge")} /> : null}
      </div>

      <p className="mt-1 text-xs leading-5 text-[#616161]">
        {hasSample ? shop.text("dummy_data_desc_active") : shop.text("dummy_data_desc_empty")}
      </p>

      {hasSample ? (
        <div className="mt-3 space-y-3">
          {/* Breakdown summary pills */}
          <div className="flex flex-wrap gap-1.5 text-xs text-amber-900">
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {sampleCustomers.length} Grahak
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {sampleEntries.length} Khata Lines
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {sampleRecords.length} Bills/Rent
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {sampleAssets.length} Rental Assets
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {sampleAgreements.length} Agreements
            </span>
            <span className="inline-flex items-center rounded-md bg-white border border-amber-200 px-2 py-0.5 font-medium shadow-xs">
              {samplePurchases.length} Suppliers
            </span>
          </div>

          {confirmRemove ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm">
              <p className="font-semibold text-red-900">{shop.text("sample_remove_confirm_title")}</p>
              <p className="mt-1 text-xs leading-5 text-red-800">{shop.text("sample_remove_confirm_desc")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  className="btn bg-red-600 text-white hover:bg-red-700 h-9 px-3.5 text-xs font-semibold shadow-sm"
                  onClick={handleRemoveSample}
                >
                  {loading ? "..." : `🗑️ ${shop.text("sample_remove_confirm_btn")}`}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className="btn btn-secondary h-9 px-3 text-xs font-medium"
                  onClick={() => setConfirmRemove(false)}
                >
                  {shop.text("sample_remove_cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                className="btn bg-red-600 hover:bg-red-700 text-white h-9 px-3.5 text-xs font-semibold shadow-sm"
                onClick={() => setConfirmRemove(true)}
              >
                🗑️ {shop.text("remove_dummy_data")}
              </button>
              <button
                type="button"
                disabled={loading}
                className="btn border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 h-9 px-3 text-xs font-medium shadow-xs"
                onClick={handleLoadSample}
              >
                {loading ? "..." : `🔄 ${shop.text("reload_dummy_data")}`}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            className="btn btn-primary font-semibold h-9 px-4 text-xs"
            disabled={loading}
            onClick={handleLoadSample}
          >
            {loading ? "..." : `+ ${shop.text("load_dummy_data")}`}
          </button>
        </div>
      )}

      {note ? <p className="mt-3 text-sm font-medium text-[#1f6b45]">{note}</p> : null}
    </section>
  );
}
