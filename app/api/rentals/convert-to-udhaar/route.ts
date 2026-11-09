import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { convertRentToUdhaar } from "@/lib/repo";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    agreementId?: string;
    amount?: number;
    note?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  if (!body?.agreementId) return bad("Rental agreement chuno.");

  const amount = wholeRupees(body.amount);
  if (amount == null) return bad("Poora rupay amount likho.");

  try {
    const result = await convertRentToUdhaar(shop.id, {
      agreementId: body.agreementId,
      amount,
      note: body.note,
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Udhaar me transfer nahi hua.");
  }
}
