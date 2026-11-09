import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { updateRecord } from "@/lib/repo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    amount?: number;
    label?: string;
    billKind?: string;
    party?: string;
    period?: string;
    note?: string;
    createdAt?: string;
    isRecurring?: boolean | number;
    recurringDay?: number;
  } | null;
  if (body?.status !== "due" && body?.status !== "paid") return bad("Due ya jama chuno.");
  const amount = wholeRupees(body.amount);
  if (amount == null || !body.label?.trim() || !body.createdAt) return bad("Label, amount, aur tareekh chahiye.");
  await updateRecord(shop.id, id, {
    status: body.status,
    amount,
    label: body.label.trim(),
    billKind: body.billKind,
    party: body.party,
    period: body.period,
    note: body.note,
    createdAt: body.createdAt,
    isRecurring: body.isRecurring != null ? (body.isRecurring ? 1 : 0) : null,
    recurringDay: body.recurringDay ?? null,
  });
  return Response.json({ ok: true });
}
