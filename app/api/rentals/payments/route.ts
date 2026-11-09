import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { addRentalPayment, listRentalPayments } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const agreementId = url.searchParams.get("agreementId") || undefined;
  const payments = await listRentalPayments(shop.id, agreementId);
  return Response.json({ payments });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    agreementId?: string;
    amount?: number;
    paymentDate?: string;
    mode?: "cash" | "UPI" | "other";
    note?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  if (!body?.agreementId) return bad("Rental agreement chuno.");

  const amount = wholeRupees(body.amount);
  if (amount == null) return bad("Poora rupay amount likho.");

  const mode = body.mode === "UPI" || body.mode === "other" ? body.mode : "cash";

  try {
    const saved = await addRentalPayment(shop.id, {
      agreementId: body.agreementId,
      amount,
      paymentDate: body.paymentDate,
      mode,
      note: body.note,
    });
    return Response.json({ ok: true, paymentId: saved.id, amount: saved.amount });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Rent payment likha nahi gaya.");
  }
}
