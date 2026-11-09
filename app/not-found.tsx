import Link from "next/link";
import { Mark } from "@/components/ui-bits";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f1ea] px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto w-fit"><Mark /></div>
        <h1 className="mt-4 text-3xl font-semibold">Yeh page nahi mila</h1>
        <p className="mt-2 text-sm leading-6 text-[#616161]">This page is not part of BolKhata. Wapas dukaan par jao, ya sign in karo.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/signin" className="btn btn-secondary">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
