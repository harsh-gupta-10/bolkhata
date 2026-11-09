import { readShop } from "@/lib/session";

export async function GET() {
  const shop = await readShop();
  if (!shop) return Response.json({ shop: null }, { status: 401 });
  return Response.json({ shop });
}
