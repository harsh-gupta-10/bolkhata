const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatRupees(amount: number): string {
  const sign = amount < 0 ? "−" : "";
  return `${sign}₹${inr.format(Math.abs(Math.round(amount)))}`;
}

export function formatPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

const IST = "Asia/Kolkata";

/** `datetime-local` value for an instant, always in IST. */
export function istLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

/** Interpret a `datetime-local` value as IST and return UTC ISO. */
export function isoFromIstLocal(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return new Date().toISOString();
  return new Date(`${value.slice(0, 16)}:00+05:30`).toISOString();
}

export function istNowLocal(): string {
  return istLocalInput(new Date().toISOString());
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.min(30, Math.floor(seconds)));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
