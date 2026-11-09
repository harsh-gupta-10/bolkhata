import { bad, isShop, requireShop } from "@/lib/api";
import { addMessage } from "@/lib/repo";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as { role?: string; text?: string } | null;
  const text = body?.text?.trim() ?? "";
  if ((body?.role !== "user" && body?.role !== "shop") || text.length < 1) return bad("Message khali hai.");
  const message = await addMessage(shop.id, body.role, text);
  return Response.json({ message });
}