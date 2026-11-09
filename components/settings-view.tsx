"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useShop } from "@/components/shop-provider";
import { leaveShop } from "@/lib/firebase-client";
import { sampleStatus } from "@/lib/sample-data";

export function SettingsView() {
  const shop = useShop();
  const router = useRouter();
  const profile = shop.data.shop;
  const [name, setName] = useState(profile.name);
  const [owner, setOwner] = useState(profile.owner_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [note, setNote] = useState("");
  const [askSample, setAskSample] = useState(false);

  return (
    <main className="h-full overflow-y-auto">
    <div className="mx-auto max-w-xl px-4 py-5 md:px-6">
        <h1 className="text-xl font-semibold">{shop.text("nav_settings")}</h1>
      <p className="mt-1 text-sm text-[#616161]">{shop.text("settings_intro")}</p>
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
        <label className="lbl">{shop.text("field_shop")}<input className="field mt-1" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="lbl">{shop.text("field_owner")}<input className="field mt-1" value={owner} onChange={(event) => setOwner(event.target.value)} /></label>
        <label className="lbl">Email<input className="field mt-1" value={profile.email} readOnly /></label>
        <label className="lbl">{shop.text("field_phone")}<input className="field mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <button type="submit" className="btn btn-primary">Save</button>
      </form>
      <section className="mt-4 rounded-xl border border-border bg-white p-4">
        <h2 className="text-sm font-semibold">{shop.text("lang_title")}</h2>
        <p className="mt-1 text-sm leading-6 text-[#616161]">{shop.text("lang_help")}</p>
        <div className="mt-3 flex gap-2">
          <button type="button" className={`btn ${shop.locale === "hinglish" ? "btn-primary" : "btn-secondary"}`} onClick={() => void shop.setLocale("hinglish")}>Hinglish</button>
          <button type="button" className={`btn ${shop.locale === "en" ? "btn-primary" : "btn-secondary"}`} onClick={() => void shop.setLocale("en")}>English</button>
        </div>
      </section>
      <SampleSection note={note} setNote={setNote} askSample={askSample} setAskSample={setAskSample} />
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

function SampleSection({ note, setNote, askSample, setAskSample }: { note: string; setNote: (value: string) => void; askSample: boolean; setAskSample: (value: boolean) => void }) {
  const shop = useShop();
  const [pending, setPending] = useState(false);
  const loaded = sampleStatus({
    customers: shop.data.customers,
    entries: shop.data.entries.map((entry) => ({ customerName: entry.customer_name, type: entry.type, amount: Number(entry.amount), note: entry.note })),
    records: shop.data.records.map((record) => ({ kind: record.kind, party: record.party, amount: Number(record.amount) })),
  }).complete;
  return (
    <section className="mt-4 rounded-xl border border-border bg-white p-4">
      <h2 className="text-sm font-semibold">{shop.text("sample_title")}</h2>
      <p className="mt-1 text-sm leading-6 text-[#616161]">{shop.text("sample_help")}</p>
      {loaded ? (
        <button type="button" className="btn btn-secondary mt-3" disabled>{shop.text("sample_done")}</button>
      ) : askSample ? (
        <button
          type="button"
          className="btn btn-secondary mt-3"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const response = await fetch("/api/sample", { method: "POST" });
            const body = (await response.json().catch(() => ({}))) as { already?: boolean };
            setPending(false);
            setAskSample(false);
            setNote(body.already ? shop.text("sample_done") : shop.text("sample_yes"));
            await shop.reload();
          }}
        >
          {shop.text("sample_yes")}
        </button>
      ) : (
        <button type="button" className="btn btn-secondary mt-3" onClick={() => setAskSample(true)}>{shop.text("sample_load")}</button>
      )}
      {note ? <p className="mt-3 text-sm">{note}</p> : null}
    </section>
  );
}
