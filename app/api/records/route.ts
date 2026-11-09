import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { addRecord, listRecords } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const kind = new URL(request.url).searchParams.get("kind");
  const filter = kind === "rent" || kind === "bill" ? kind : undefined;
  return Response.json({ records: await listRecords(shop.id, filter) });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    status?: string;
    amount?: number;
    label?: string;
    billKind?: string;
    party?: string;
    period?: string;
    note?: string;
    transcript?: string;
    createdAt?: string;
    confirmed?: boolean;
    isRecurring?: boolean | number;
    recurringDay?: number;
  } | null;
  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  if (body?.kind !== "rent" && body?.kind !== "bill") return bad("Kiraya ya bill chuno.");
  if (body.status !== "due" && body.status !== "paid") return bad("Due ya jama chuno.");
  const amount = wholeRupees(body.amount);
  if (amount == null) return bad("Poora rupay amount likho.");
  const saved = await addRecord(shop.id, {
    kind: body.kind,
    status: body.status,
    amount,
    label: body.label?.trim() || (body.kind === "rent" ? "Kiraya" : "Bill"),
    billKind: body.billKind,
    party: body.party,
    period: body.period,
    note: body.note,
    transcript: body.transcript,
    createdAt: body.createdAt,
    isRecurring: body.isRecurring ? 1 : 0,
    recurringDay: body.recurringDay,
  });
  return Response.json({ ok: true, recordId: saved.id });
}
