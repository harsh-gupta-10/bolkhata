import { isShop, requireShop } from "@/lib/api";
import { getLastPurchaseForItem } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  if (!q) return Response.json({ purchase: null });
  const purchase = await getLastPurchaseForItem(shop.id, q);
  return Response.json({ purchase });
}
