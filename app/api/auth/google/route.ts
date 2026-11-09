import { bad } from "@/lib/api";
import { googleAccountDecision, verifyGoogleIdToken } from "@/lib/firebase-token";
import { findShopsByEmail } from "@/lib/repo";
import { normalizeEmail, startSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { idToken?: string; shopName?: string } | null;
  const idToken = body?.idToken?.trim() ?? "";
  if (idToken.length < 20) return bad("Google token nahi mila.");
  let account;
  try {
    account = await verifyGoogleIdToken(idToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google token verify nahi hua.";
    return bad(message === "Google sign-in chahiye." || message === "Google email verified nahi hai." || message === "Google email nahi mila." ? message : "Google token verify nahi hua.", 401);
  }
  const email = normalizeEmail(account.email);
  const shops = await findShopsByEmail(email);
  const decision = googleAccountDecision(shops.length);
  if (decision === "setup") {
    return Response.json({ status: "setup", email, name: account.name });
  }
  if (decision === "choose" && !body?.shopName?.trim()) {
    return Response.json({ status: "choose", email, name: account.name, shops: shops.map((shop) => ({ id: shop.id, name: shop.name })) });
  }
  const wanted = body?.shopName?.trim().toLowerCase();
  const shop = shops.length === 1 ? shops[0] : shops.find((item) => item.name.toLowerCase() === wanted);
  if (!shop) return bad("Dukaan ka naam chuno.", 409);
  await startSession(shop.id);
  return Response.json({ status: "shop", shop });
}
