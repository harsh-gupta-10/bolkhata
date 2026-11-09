"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleButton } from "@/components/google-button";
import { Mark } from "@/components/ui-bits";

export default function SetupPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm">Setup…</main>}>
      <SetupForm />
    </Suspense>
  );
}

function SetupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefilledEmail = params.get("email") ?? "";
  const prefilledName = params.get("name") ?? "";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5f3] px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold"><Mark size={24} /> BolKhata</Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Apni dukaan kholo</h1>
        <p className="mt-2 text-sm leading-6 text-[#616161]">
          {prefilledEmail ? "Google email yahan aa gayi. Dukaan ka naam likho, phir khata khulega." : "Yahi email baad mein sign in ke liye hai. Koi link nahi aayega — seedha yahi page kholo."}
        </p>
        <div className="mt-5">
          <GoogleButton label="Google se continue" />
        </div>
        <p className="mt-4 text-center text-xs text-[#616161]">ya khud likho</p>
        <form
          className="mt-4 space-y-4 pb-1"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            const form = new FormData(event.currentTarget);
            const response = await fetch("/api/auth/setup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                shopName: form.get("shopName"),
                ownerName: form.get("ownerName"),
                email: form.get("email"),
                phone: form.get("phone"),
              }),
            });
            const data = (await response.json()) as { error?: string };
            setPending(false);
            if (!response.ok) {
              setError(data.error || "Setup nahi hua.");
              return;
            }
            router.push("/app");
          }}
        >
          <label className="lbl">Dukaan ka naam<input className="field" name="shopName" required /></label>
          <label className="lbl">Malik ka naam<input className="field" name="ownerName" required defaultValue={prefilledName} key={prefilledName} /></label>
          <label className="lbl">Email<input className="field" name="email" type="email" required autoComplete="email" defaultValue={prefilledEmail} key={prefilledEmail} /></label>
          <label className="lbl">Phone, optional<input className="field" name="phone" inputMode="numeric" autoComplete="tel" /></label>
          {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn btn-primary h-10 w-full">{pending ? "Likh rahe hain…" : "Get started"}</button>
        </form>
        <p className="mt-4 text-sm">Pehle se dukaan hai? <Link href="/signin" className="font-semibold">Sign in</Link></p>
      </div>
    </main>
  );
}
