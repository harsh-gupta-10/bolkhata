"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  BookOpen,
  Building2,
  House,
  KeyRound,
  Menu,
  MessageCircle,
  Mic,
  Package,
  Plus,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { formatRupees } from "@/lib/format";
import type { CopyKey } from "@/lib/i18n";
import { Mark, SampleTag } from "@/components/ui-bits";
import { blankDraft, useShop, type WorkIntent } from "@/components/shop-provider";
import { leaveShop } from "@/lib/firebase-client";
import { computeSampleStats, SampleGlobalBanner, SampleRemoveModal } from "@/components/sample-controls";

const LINKS: { href: string; label: CopyKey; icon: any }[] = [
  { href: "/app", label: "nav_home", icon: House },
  { href: "/app/baat", label: "nav_baat", icon: MessageCircle },
  { href: "/app/udhaar", label: "nav_udhaar", icon: BookOpen },
  { href: "/app/jama", label: "nav_jama", icon: ArrowDownLeft },
  { href: "/app/rentals", label: "nav_rentals", icon: KeyRound },
  { href: "/app/kiraya", label: "nav_kiraya", icon: Building2 },
  { href: "/app/bills", label: "nav_bills", icon: Receipt },
  { href: "/app/suppliers", label: "nav_suppliers", icon: Truck },
  { href: "/app/grahak", label: "nav_grahak", icon: Users },
  { href: "/app/settings", label: "nav_settings", icon: Settings },
];

export function ShopShell({ children }: { children: React.ReactNode }) {
  const shop = useShop();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    customers: any[];
    renters: any[];
    assets: any[];
    records: any[];
    notes: any[];
    suppliers: any[];
  } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const data = shop.data;
  const outstanding = data.customers.reduce((sum, customer) => sum + Math.max(0, Number(customer.balance) || 0), 0);

  // Global search debounced fetch
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const body = (await res.json()) as any;
          setSearchResults(body.results ?? null);
        }
      } catch {
        setSearchResults(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goAdd(intent: WorkIntent) {
    setAddOpen(false);
    shop.openDraft(blankDraft(intent, "manual"));
  }

  const sampleStats = computeSampleStats(shop);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  async function handleLoadSample() {
    setLoadingSample(true);
    try {
      await fetch("/api/sample", { method: "POST" });
      await shop.reload();
    } finally {
      setLoadingSample(false);
    }
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4" aria-label="Dukaan">
      {LINKS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-[13px] font-medium md:h-9 md:min-h-0 ${active ? "bg-[#f1f2f4] text-[#1a1c1e]" : "text-[#303336] hover:bg-[#f6f6f7]"}`}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span className="flex-1">{shop.text(item.label)}</span>
            {item.href === "/app/udhaar" ? <span className="text-[11px] text-[#616161] tabular-nums">{formatRupees(outstanding)}</span> : null}
            {item.href === "/app/grahak" ? <span className="text-[11px] text-[#616161]">{data.customers.length}</span> : null}
            {item.href === "/app/rentals" && (data.assets?.length ?? 0) > 0 ? (
              <span className="text-[11px] text-[#616161]">{data.assets.length}</span>
            ) : null}
          </Link>
        );
      })}

      {/* Quick Dummy Data Action in Sidebar / Drawer */}
      <div className="mt-2 border-t border-border/60 pt-2">
        {sampleStats.hasSample ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShowRemoveModal(true);
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 md:h-9 md:min-h-0 transition-colors"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            <span className="flex-1 text-left">{shop.text("remove_dummy_data")}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={loadingSample}
            onClick={async () => {
              setOpen(false);
              await handleLoadSample();
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-[#1f6b45] hover:bg-[#e7f5ee] md:h-9 md:min-h-0 transition-colors"
          >
            <Sparkles size={16} strokeWidth={1.75} />
            <span className="flex-1 text-left">{loadingSample ? "..." : shop.text("load_dummy_data")}</span>
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh bg-[#f1f2f4]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white md:flex">
        <Link href="/app" className="flex items-center gap-2 px-4 py-4">
          <Mark />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate">BolKhata</span>
            <span className="block truncate text-xs text-[#616161]">{data.shop.name}</span>
            {sampleStats.hasSample ? (
              <span className="mt-1 block">
                <SampleTag text={shop.text("demo_mode_badge")} />
              </span>
            ) : null}
          </span>
        </Link>
        {nav}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" className="absolute inset-0 bg-[#1a1c1e]/40" aria-label={shop.text("menu_close")} onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white">
            <div className="flex items-center gap-2 px-4 py-4">
              <Mark />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold truncate">{data.shop.name}</span>
                {sampleStats.hasSample ? (
                  <span className="mt-0.5 block">
                    <SampleTag text={shop.text("demo_mode_badge")} />
                  </span>
                ) : null}
              </div>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b border-border bg-white px-2 sm:px-3">
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border md:hidden" aria-label={shop.text("menu_open")} onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>

          {/* Global Search Box in Header */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm">
            <div className="relative">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#616161]" />
              <input
                className="field h-9 pl-8 pr-7 text-xs w-full bg-[#f8f9fa] focus:bg-white"
                placeholder={shop.text("search_placeholder")}
                value={searchQuery}
                onFocus={() => setShowSearchModal(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchModal(true);
                }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#616161]"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Global Search Dropdown */}
            {showSearchModal && searchResults && (
              <div className="absolute left-0 top-11 z-50 w-80 sm:w-96 rounded-xl border border-border bg-white p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
                {searchResults.customers?.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#8d5a2b] uppercase">Grahak (Customers)</p>
                    {searchResults.customers.map((c) => (
                      <Link
                        key={c.id}
                        href="/app/grahak"
                        onClick={() => setShowSearchModal(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[#f6f6f7]"
                      >
                        <span className="font-medium text-[#1a1c1e]">{c.name}</span>
                        <span className="text-[#616161]">{c.phone || "phone nahi"} · Baaki {formatRupees(c.balance || 0)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.assets?.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#8d5a2b] uppercase">Rental Assets</p>
                    {searchResults.assets.map((a) => (
                      <Link
                        key={a.id}
                        href="/app/rentals"
                        onClick={() => setShowSearchModal(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[#f6f6f7]"
                      >
                        <span className="font-medium text-[#1a1c1e]">{a.name} ({a.type})</span>
                        <span className="text-[#616161]">{a.status} · {formatRupees(a.rate_amount)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.suppliers?.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#8d5a2b] uppercase">Suppliers / Purchases</p>
                    {searchResults.suppliers.map((s) => (
                      <Link
                        key={s.id}
                        href="/app/suppliers"
                        onClick={() => setShowSearchModal(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[#f6f6f7]"
                      >
                        <span className="font-medium text-[#1a1c1e]">{s.supplier_name}</span>
                        <span className="text-[#616161]">{s.items_text} · {formatRupees(s.amount)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.records?.length > 0 && (
                  <div className="mb-2">
                    <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#8d5a2b] uppercase">Kiraya & Bills</p>
                    {searchResults.records.map((r) => (
                      <Link
                        key={r.id}
                        href={r.kind === "rent" ? "/app/kiraya" : "/app/bills"}
                        onClick={() => setShowSearchModal(false)}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-[#f6f6f7]"
                      >
                        <span className="font-medium text-[#1a1c1e]">{r.label} ({r.kind})</span>
                        <span className="text-[#616161]">{r.status} · {formatRupees(r.amount)}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.notes?.length > 0 && (
                  <div className="mb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[#8d5a2b] uppercase">Yaad (Memory Notes)</p>
                    {searchResults.notes.map((n) => (
                      <div key={n.id} className="rounded-lg px-2 py-1.5 text-xs text-[#616161] bg-[#f8f9fa]">
                        <span className="font-medium text-[#1a1c1e]">{n.name}:</span> {n.user_note}
                      </div>
                    ))}
                  </div>
                )}

                {searchResults.customers?.length === 0 &&
                  searchResults.assets?.length === 0 &&
                  searchResults.suppliers?.length === 0 &&
                  searchResults.records?.length === 0 &&
                  searchResults.notes?.length === 0 && (
                    <p className="p-3 text-center text-xs text-[#616161]">Kuch nahi mila.</p>
                  )}
              </div>
            )}
          </div>

          {/* Quick Dummy Data button in Header */}
          {sampleStats.hasSample ? (
            <button
              type="button"
              onClick={() => setShowRemoveModal(true)}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 shrink-0 transition-colors"
              title={shop.text("remove_dummy_data")}
            >
              <Trash2 size={13} />
              <span>{shop.text("remove_dummy_data")}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loadingSample}
              onClick={handleLoadSample}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 text-xs font-semibold text-[#1f6b45] shrink-0 transition-colors"
              title={shop.text("load_dummy_data")}
            >
              <Sparkles size={13} />
              <span>{loadingSample ? "..." : shop.text("load_dummy_data")}</span>
            </button>
          )}

          <div className="relative shrink-0">
            <button type="button" className="btn btn-secondary h-11 px-3" onClick={() => setAddOpen((value) => !value)}>
              <Plus size={16} /> <span className="hidden sm:inline">{shop.text("new")}</span>
            </button>
            {addOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-white p-1 shadow-lg">
                {(["udhaar", "payment", "add_customer", "start_rental", "supplier_purchase", "rent", "bill"] as WorkIntent[]).map((intent) => (
                  <button key={intent} type="button" className="block h-9 w-full rounded-md px-2 text-left text-sm hover:bg-[#f6f6f7]" onClick={() => goAdd(intent)}>
                    {labelFor(intent, shop.text)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Link href="/app/baat" prefetch className="btn btn-primary h-11 shrink-0 px-3" aria-label={shop.text("speak")}>
            <Mic size={14} /> <span className="hidden sm:inline">{shop.text("speak")}</span>
          </Link>

          <button
            type="button"
            className="hidden text-sm text-[#616161] sm:inline"
            onClick={async () => {
              await leaveShop();
              router.push("/");
            }}
          >
            {shop.text("sign_out")}
          </button>
        </header>
        <SampleGlobalBanner />
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        <SampleRemoveModal open={showRemoveModal} onOpenChange={setShowRemoveModal} />
      </div>
    </div>
  );
}

function labelFor(intent: WorkIntent, text: (key: CopyKey) => string): string {
  if (intent === "udhaar") return text("nav_udhaar");
  if (intent === "payment") return text("nav_jama");
  if (intent === "add_customer") return text("nav_grahak");
  if (intent === "start_rental") return text("start_rental");
  if (intent === "supplier_purchase") return text("add_purchase");
  if (intent === "rent") return text("kiraya_diya_tab");
  return text("nav_bills");
}
