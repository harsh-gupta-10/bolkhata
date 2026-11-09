import { bad } from "@/lib/api";
import { findShopsByEmail } from "@/lib/repo";
import { normalizeEmail, startSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; shopName?: string } | null;
  const email = normalizeEmail(body?.email ?? "");
  if (!email.includes("@")) return bad("Wahi email likho jo setup mein diya tha.");
  const shops = await findShopsByEmail(email);
  if (shops.length === 0) return bad("Is email par koi dukaan nahi mili. Pehle Get started karein.", 404);
  if (shops.length === 1 && !body?.shopName?.trim()) {
    await startSession(shops[0].id);
    return Response.json({ shop: shops[0] });
  }
  const wanted = body?.shopName?.trim().toLowerCase() ?? "";
  const shop = shops.find((item) => item.name.toLowerCase() === wanted);
  if (!shop) {
    return Response.json(
      { error: "Is email par ek se zyada dukaan hai. Dukaan ka naam chuno.", shops: shops.map((item) => ({ id: item.id, name: item.name })) },
      { status: 409 },
    );
  }
  await startSession(shop.id);
  return Response.json({ shop });
}
