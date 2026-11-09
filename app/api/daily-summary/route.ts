import { isShop, requireShop } from "@/lib/api";
import { getDailyCashSummary } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date") || undefined;
  const summary = await getDailyCashSummary(shop.id, dateParam);
  return Response.json({ summary });
}
