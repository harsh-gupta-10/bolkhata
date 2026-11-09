"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-8 pt-16 pb-28">
      <p className="text-sm font-semibold tracking-wide text-terracotta uppercase">BolKhata</p>
      <h1 className="font-display mt-2 text-4xl text-maroon">Kuch gadbad ho gayi</h1>
      <p className="mt-3 text-lg leading-7">Khata dubara kholo. Jo likha ja chuka hai dukaan ke hisaab mein pada hai.</p>
      <Button type="button" className="mt-6 h-12 px-5 text-base" onClick={reset}>
        Dobara kholo
      </Button>
    </main>
  );
}
