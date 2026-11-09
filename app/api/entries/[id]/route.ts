import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { updateEntry } from "@/lib/repo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    customerId?: string;
    amount?: number;
    note?: string;
    createdAt?: string;
    confirmed?: boolean;
    dueDate?: string;
  } | null;
  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  const amount = wholeRupees(body?.amount);
  if (!body?.customerId || amount == null || !body.createdAt) return bad("Grahak, amount, aur tareekh chahiye.");
  try {
    await updateEntry(shop.id, id, { customerId: body.customerId, amount, note: body.note, createdAt: body.createdAt, dueDate: body.dueDate });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Entry update nahi hui.");
  }
  return Response.json({ ok: true });
}
