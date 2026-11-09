"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GoogleButton } from "@/components/google-button";
import { Mark } from "@/components/ui-bits";

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="grid min-h-dvh place-items-center text-sm">Sign in…</main>}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [error, setError] = useState("");
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [pending, setPending] = useState(false);

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f6f5f3] px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold"><Mark size={24} /> BolKhata</Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-[#616161]">Wahi email jo setup mein diya tha. Ek email par kai dukaan hon to naam bhi chuno.</p>
        <div className="mt-5">
          <GoogleButton label="Continue with Google" />
        </div>
        <p className="mt-4 text-center text-xs text-[#616161]">ya email</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            const form = new FormData(event.currentTarget);
            const response = await fetch("/api/auth/signin", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: form.get("email"), shopName: form.get("shopName") }),
            });
            const data = (await response.json()) as { error?: string; shops?: { id: string; name: string }[] };
            setPending(false);
            if (response.status === 409 && data.shops) {
              setShops(data.shops);
              setError(data.error || "Dukaan ka naam chuno.");
              return;
            }
            if (!response.ok) {
              setError(data.error || "Sign in nahi hua.");
              return;
            }
            router.push(next?.startsWith("/app") ? next : "/app");
          }}
        >
          <label className="lbl">Email<input className="field" name="email" type="email" required autoComplete="email" /></label>
          {shops.length > 0 ? (
            <label className="lbl">Dukaan
              <select className="field" name="shopName" required defaultValue="">
                <option value="" disabled>Chuno</option>
                {shops.map((shop) => <option key={shop.id} value={shop.name}>{shop.name}</option>)}
              </select>
            </label>
          ) : null}
          {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn btn-primary h-10 w-full">{pending ? "Dekh rahe hain…" : "Sign in"}</button>
        </form>
        <p className="mt-4 text-sm">Nayi dukaan? <Link href="/setup" className="font-semibold">Get started</Link></p>
      </div>
    </main>
  );
}
