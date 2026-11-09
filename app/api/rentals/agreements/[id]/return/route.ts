import { bad, isShop, requireShop } from "@/lib/api";
import { returnRentalEquipment } from "@/lib/repo";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    actualReturnDate?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");

  try {
    const res = await returnRentalEquipment(shop.id, id, body?.actualReturnDate);
    return Response.json({ ok: true, ...res });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Return record nahi hua.");
  }
}
