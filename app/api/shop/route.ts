import { bad, isShop, requireShop } from "@/lib/api";
import { updateShop } from "@/lib/repo";
import { readShop } from "@/lib/session";

export async function PATCH(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as { name?: string; ownerName?: string; phone?: string; locale?: string } | null;
  const name = body?.name?.trim() || shop.name;
  const ownerName = body?.ownerName?.trim() || shop.owner_name;
  if (name.length < 2 || ownerName.length < 2) return bad("Dukaan aur malik ka naam likho.");
  await updateShop(shop.id, { name, ownerName, phone: body?.phone ?? shop.phone, locale: body?.locale ?? shop.locale });
  return Response.json({ shop: await readShop() });
}
