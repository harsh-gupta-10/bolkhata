"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, type User } from "firebase/auth";
import { firebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";

interface ShopChoice {
  id: string;
  name: string;
}

interface GoogleBody {
  status?: string;
  email?: string;
  name?: string;
  error?: string;
  shops?: ShopChoice[];
}

export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [choices, setChoices] = useState<ShopChoice[]>([]);
  const [shopName, setShopName] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    let cancel = false;
    void getRedirectResult(firebaseAuth())
      .then(async (result) => {
        if (cancel || !result?.user) return;
        const next = await postGoogle(await result.user.getIdToken());
        if (cancel) return;
        routeGoogle(router, next, setChoices, setError);
      })
      .catch((caught) => {
        if (!cancel) setError(googleMessage(caught));
      });
    return () => {
      cancel = true;
    };
  }, [router]);

  async function continueWith(user: User, chosenShop?: string) {
    setPending(true);
    setError("");
    const next = await postGoogle(await user.getIdToken(), chosenShop);
    setPending(false);
    if (next.error && !next.status) {
      setError(next.error);
      return;
    }
    routeGoogle(router, next, setChoices, setError);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="btn btn-secondary h-10 w-full"
        disabled={pending}
        onClick={() => {
          if (!isFirebaseConfigured()) {
            setError("Google sign-in is not configured on this deployment. Please set NEXT_PUBLIC_FIREBASE_API_KEY.");
            return;
          }
          setError("");
          setPending(true);
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          void signInWithPopup(firebaseAuth(), provider)
            .then((result) => continueWith(result.user))
            .catch(async (caught: { code?: string }) => {
              if (caught?.code === "auth/popup-blocked") {
                await signInWithRedirect(firebaseAuth(), provider);
                return;
              }
              setPending(false);
              setError(googleMessage(caught));
            });
        }}
      >
        {pending ? "Google…" : label}
      </button>
      {choices.length > 0 ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            const user = firebaseAuth().currentUser;
            if (!user) {
              setError("Google session khatam. Dobara continue karein.");
              return;
            }
            void continueWith(user, shopName);
          }}
        >
          <label className="lbl">Dukaan
            <select className="field" value={shopName} required onChange={(event) => setShopName(event.target.value)}>
              <option value="">Chuno</option>
              {choices.map((shop) => (
                <option key={shop.id} value={shop.name}>{shop.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary h-10 w-full">Is dukaan mein jao</button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-[#8f3d32]">{error}</p> : null}
    </div>
  );
}

async function postGoogle(idToken: string, shopName?: string): Promise<GoogleBody> {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, shopName }),
  });
  const data = (await response.json().catch(() => ({}))) as GoogleBody;
  if (!response.ok) return { error: data.error || "Google sign-in nahi hua." };
  return data;
}

function routeGoogle(
  router: { push: (href: string) => void },
  data: GoogleBody,
  setChoices: (shops: ShopChoice[]) => void,
  setError: (message: string) => void,
) {
  if (data.error && !data.status) {
    setError(data.error);
    return;
  }
  if (data.status === "shop") {
    router.push("/app");
    return;
  }
  if (data.status === "choose" && data.shops) {
    setChoices(data.shops);
    return;
  }
  const email = encodeURIComponent(data.email ?? "");
  const name = encodeURIComponent(data.name ?? "");
  router.push(`/setup?email=${email}&name=${name}`);
}

function googleMessage(caught: unknown): string {
  const code = typeof caught === "object" && caught && "code" in caught ? String((caught as { code?: string }).code) : "";
  if (code === "auth/popup-closed-by-user") return "Google window band ho gayi. Dobara Continue with Google dabayein.";
  if (code === "auth/unauthorized-domain") return "Is website par Google sign-in allowed nahi. Domain Firebase Console mein add hona chahiye.";
  if (code === "auth/popup-blocked") return "Popup block ho gaya. Redirect se try kar rahe hain.";
  return "Google sign-in nahi hua. Neeche email se chala sakte ho.";
}
