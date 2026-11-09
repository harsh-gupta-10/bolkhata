"use client";

import { useState } from "react";
import { Plus, Send } from "lucide-react";
import { formatWhen } from "@/lib/format";
import { shouldSendOnKey } from "@/lib/product";
import { blankDraft, useShop, type WorkIntent } from "@/components/shop-provider";
import { useMic } from "@/components/use-mic";

const STARTERS: { intent: WorkIntent; label: string }[] = [
  { intent: "udhaar", label: "Udhaar" },
  { intent: "payment", label: "Jama" },
  { intent: "add_customer", label: "Grahak" },
  { intent: "rent", label: "Kiraya" },
  { intent: "bill", label: "Bill" },
  { intent: "balance", label: "Baaki" },
];

export function BaatView() {
  const shop = useShop();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const mic = useMic((transcript) => {
    setText("");
    void shop.speak(transcript);
  });

  function send() {
    const line = text.trim();
    if (!line) return;
    setText("");
    void shop.speak(line);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
          {shop.thread.length === 0 && !shop.draft ? (
            <div className="rounded-xl border border-border bg-white px-5 py-8">
              <h1 className="text-xl font-semibold">{shop.text("chat_title")}</h1>
              <p className="mt-2 text-sm leading-6 text-[#616161]">{shop.text("chat_body")}</p>
            </div>
          ) : null}
          {shop.thread.map((turn) => (
            <article key={turn.id} className={`max-w-[36rem] rounded-xl px-4 py-3 text-sm leading-6 ${turn.role === "user" ? "ml-auto bg-[#1a1c1e] text-white" : "border border-border bg-white"}`}>
              <p>{turn.text}</p>
              <p className={`mt-1 text-[11px] ${turn.role === "user" ? "text-white/70" : "text-[#616161]"}`}>{formatWhen(turn.at)}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="border-t border-border bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl">
          {shop.error || mic.error ? <p className="mb-2 rounded-lg bg-[#8f3d32] px-3 py-2 text-sm text-white">{shop.error || mic.error}</p> : null}
          {mic.recording || mic.busy ? <p className="mb-2 text-sm text-[#616161]">{mic.recording ? `Sun raha hoon · ${Math.ceil(Math.max(0, 30 - mic.elapsed))}s baaki` : "Sun liya…"}</p> : null}
          {menu ? (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {STARTERS.map((item) => (
                <button key={item.intent} type="button" className="btn btn-secondary" onClick={() => { shop.openDraft(blankDraft(item.intent, "manual")); setMenu(false); }}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
          <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); send(); }}>
            <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border" aria-label={shop.text("new")} onClick={() => setMenu((open) => !open)}>
              <Plus size={16} />
            </button>
            <label className="sr-only" htmlFor="composer">{shop.text("chat_placeholder")}</label>
            <textarea
              id="composer"
              rows={1}
              value={text}
              placeholder={shop.text("chat_placeholder")}
              className="field h-11 flex-1 py-2"
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (shouldSendOnKey({ key: event.key, shiftKey: event.shiftKey, composing: event.nativeEvent.isComposing })) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <button type="submit" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border" aria-label={shop.text("send")}>
              <Send size={16} />
            </button>
            <button type="button" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#8f3d32] text-white" aria-label={mic.recording ? "Recording rok do" : "Bol ke khata likho"} aria-pressed={mic.recording} disabled={mic.busy} onClick={() => (mic.recording ? mic.stop() : void mic.start())}>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
