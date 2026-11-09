import { isShop, requireShop } from "@/lib/api";
import { resolveName } from "@/lib/repo";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim() ?? "";
  if (name.length < 1) return Response.json({ kind: "none", people: [], summary: "Naam likho." });
  const presented = await resolveName(shop.id, name);
  if (presented.kind === "one") {
    return Response.json({ kind: "one", person: presented.person, people: [presented.person], summary: presented.summary });
  }
  if (presented.kind === "many") {
    return Response.json({ kind: "many", people: presented.people, summary: presented.summary });
  }
  return Response.json({ kind: "none", people: [], summary: presented.summary });
}
