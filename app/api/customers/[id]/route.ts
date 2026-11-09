import { bad, isShop, requireShop } from "@/lib/api";
import { updateCustomer } from "@/lib/repo";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { name?: string; phone?: string; creditLimit?: number } | null;
  const name = body?.name?.trim() ?? "";
  if (name.length < 2) return bad("Naam theek se likho.");
  try {
    await updateCustomer(shop.id, id, { name, phone: body?.phone, creditLimit: body?.creditLimit });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Update nahi hua.");
  }
  return Response.json({ ok: true });
}
