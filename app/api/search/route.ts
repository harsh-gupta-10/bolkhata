import { isShop, requireShop } from "@/lib/api";
import { searchEverywhere } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || "";
  const results = await searchEverywhere(shop.id, q);
  return Response.json({ results });
}
