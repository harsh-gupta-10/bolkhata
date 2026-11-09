import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { updateSupplierPurchase } from "@/lib/repo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    status?: "paid" | "pending";
    amount?: number;
    itemsText?: string;
    supplierName?: string;
    note?: string;
  } | null;

  let amount: number | undefined;
  if (body?.amount != null) {
    const parsed = wholeRupees(body.amount);
    if (parsed == null) return bad("Amount poora rupay ho.");
    amount = parsed;
  }

  try {
    await updateSupplierPurchase(shop.id, id, {
      status: body?.status,
      amount,
      itemsText: body?.itemsText,
      supplierName: body?.supplierName,
      note: body?.note,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Purchase update nahi hua.");
  }
}
