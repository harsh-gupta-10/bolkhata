import Link from "next/link";
import { Badge, Mark } from "@/components/ui-bits";

export function MarketingHome() {
  return (
    <div className="min-h-dvh bg-[#f4f1ea] text-[#1a1c1e]">
      <header className="sticky top-0 z-10 border-b border-[#e4ddd3] bg-[#f4f1ea]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <Mark />
            BolKhata
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/signin" className="rounded-lg px-3 py-2 hover:bg-white">Sign in</Link>
            <Link href="/setup" className="btn btn-primary">Start a shop</Link>
          </nav>
        </div>
      </header>
      <main>
        <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rise-in">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8d5a2b] uppercase">For kirana shops</p>
            <h1 className="mt-4 max-w-xl text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl">A voice khata that waits until you say yes.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#3d4742]">
              BolKhata is the digital khata for a shop counter in India. Speak or type Hinglish. It prepares udhaar, payments, rent, and bills, then shows the person — name and phone — before a single rupee is written.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/setup" className="btn btn-primary h-11 px-5">Start a shop</Link>
              <Link href="/signin" className="btn btn-secondary h-11 px-5">Sign in</Link>
            </div>
          </div>
          <LedgerPreview />
        </section>
        <section className="border-y border-[#e4ddd3] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="rise-in text-3xl font-semibold tracking-tight">How a line becomes a book</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ["1", "Open the shop", "Name the dukaan. Come back with the same email, or with Google."],
                ["2", "One chat for every job", "Udhaar, jama, kiraya, bills, and questions share a single thread that stays with the shop."],
                ["3", "Confirm the person", "The card shows the name and a 10-digit phone. Nothing is saved until you tap Confirm."],
              ].map(([step, title, body], index) => (
                <article key={step} className="rise-in rounded-xl border border-[#e4ddd3] bg-[#f4f1ea] p-5" style={{ animationDelay: `${index * 80}ms` }}>
                  <p className="text-sm font-semibold text-[#8d5a2b]">{step}</p>
                  <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4d5a53]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
          <div className="rise-in">
            <h2 className="text-3xl font-semibold tracking-tight">Voice, or the same words typed</h2>
            <p className="mt-4 text-base leading-7 text-[#3d4742]">Tap the mic to start, and tap again to stop. You can also type and press Enter. Speech in uses Gnani Prisma v2.5. Speech back uses Gnani Timbre v2.5, voice Poorvi. Either way you get a draft. Money is saved only after you confirm the person.</p>
          </div>
          <div className="rise-in rounded-xl border border-[#e4ddd3] bg-white p-4 shadow-sm" style={{ animationDelay: "120ms" }}>
            <p className="ml-auto max-w-sm rounded-2xl bg-[#1a1c1e] px-4 py-3 text-sm text-white">Ramesh ko 250 rupay udhaar, atta 5 kilo</p>
            <div className="mt-3 rounded-xl border border-[#e4ddd3] p-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#8d5a2b] uppercase">Confirm</p>
              <p className="mt-2 text-xl font-semibold">Ramesh Kumar</p>
              <p className="text-sm tabular-nums">90000 11111</p>
              <p className="mt-2 text-sm text-[#616161]">Udhaar ₹250 · atta 5 kilo</p>
              <span className="btn btn-primary mt-4">Confirm</span>
            </div>
          </div>
        </section>
        <section className="border-y border-[#e4ddd3] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight">The books, on a phone or a counter</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4d5a53]">Each book is a list you can search. On a phone it stacks into cards. On a wider screen it is a table.</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ["Credit", "Udhaar given, with the running balance on the same card."],
                ["Payments", "Money received, assigned to the right person."],
                ["Rent", "Shop kiraya, the landlord, and the month."],
                ["Bills", "Bijli, paani, or another vendor."],
                ["Customers", "People who have a khata, not an empty address book."],
                ["Memory", "A short note about a person, read back the next time you speak."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-xl border border-[#e4ddd3] bg-[#f4f1ea] px-4 py-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#4d5a53]">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight">A note stays with the person.</h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#3d4742]">When you confirm a line, BolKhata remembers the name, the phone, the amount, and the item. You can add or remove those notes yourself. The next sentence only sees the people who matter.</p>
          <div className="mt-8 max-w-md rounded-xl border border-[#e4ddd3] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Ramesh Kumar</p>
                <p className="text-sm text-[#616161]">90000 11111 · udhaar · ₹250</p>
                <p className="mt-1 text-sm">atta 5 kilo</p>
              </div>
              <Badge tone="due">Udhaar</Badge>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#e4ddd3] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-[#616161]">
          <span className="flex items-center gap-2 font-semibold text-[#1a1c1e]"><Mark size={22} /> BolKhata</span>
          <span className="flex gap-4">
            <Link href="/setup">Start a shop</Link>
            <Link href="/signin">Sign in</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

function LedgerPreview() {
  return (
    <div className="rise-in overflow-hidden rounded-2xl border border-[#e4ddd3] bg-[#f1f2f4] shadow-sm" style={{ animationDelay: "140ms" }}>
      <div className="flex h-12 items-center gap-2 border-b border-[#e4ddd3] bg-white px-3">
        <Mark size={22} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Example shop</p>
          <p className="text-[11px] text-[#616161]">Credit</p>
        </div>
      </div>
      <div className="p-3">
        <article className="rounded-xl border border-[#e4ddd3] bg-white px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold">Imran Sheikh</p>
              <p className="mt-0.5 text-sm text-[#616161]">90000 33333 · tel 1 litre</p>
              <p className="mt-1 text-xs whitespace-nowrap text-[#616161]">3 Nov, 8:30 am</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-semibold text-[#8f3d32] tabular-nums">₹150</p>
              <p className="mt-1 text-xs text-[#616161] tabular-nums">₹150</p>
            </div>
          </div>
        </article>
        <p className="mt-3 px-1 text-xs text-[#616161]">One sample line. Loading it again does not copy it.</p>
      </div>
    </div>
  );
}
