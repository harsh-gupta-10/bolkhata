import { bad } from "@/lib/api";
import { findShopsByEmail, insertShop } from "@/lib/repo";
import { normalizeEmail, normalizePhone, startSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    shopName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
  } | null;
  const shopName = body?.shopName?.trim() ?? "";
  const ownerName = body?.ownerName?.trim() ?? "";
  const email = normalizeEmail(body?.email ?? "");
  if (shopName.length < 2 || ownerName.length < 2 || !email.includes("@")) {
    return bad("Dukaan ka naam, malik ka naam, aur email zaroori hai.");
  }
  const existing = await findShopsByEmail(email);
  if (existing.some((shop) => shop.name.toLowerCase() === shopName.toLowerCase())) {
    return bad("Is email par yeh dukaan pehle se hai. Sign in karein.", 409);
  }
  const shop = await insertShop({ name: shopName, ownerName, email, phone: normalizePhone(body?.phone) });
  await startSession(shop.id);
  return Response.json({ shop });
}
