import { readShop, type Shop } from "@/lib/session";

export async function requireShop(): Promise<Shop | Response> {
  const shop = await readShop();
  if (!shop) {
    return Response.json({ error: "Sign in chahiye.", code: "unauthenticated" }, { status: 401 });
  }
  return shop;
}

export function isShop(value: Shop | Response): value is Shop {
  return !(value instanceof Response);
}

export function bad(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export { wholeRupees } from "@/lib/money";
