import { bad, isShop, requireShop } from "@/lib/api";
import { undoCustomer, undoEntry, undoRecord, undoRentalPayment, undoSupplierPurchase } from "@/lib/repo";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    entryId?: string;
    recordId?: string;
    customerId?: string;
    rentalPaymentId?: string;
    paymentId?: string;
    purchaseId?: string;
  } | null;
  try {
    if (body?.entryId) await undoEntry(shop.id, body.entryId);
    else if (body?.recordId) await undoRecord(shop.id, body.recordId);
    else if (body?.rentalPaymentId || body?.paymentId) await undoRentalPayment(shop.id, (body.rentalPaymentId || body.paymentId)!);
    else if (body?.purchaseId) await undoSupplierPurchase(shop.id, body.purchaseId);
    else return bad("Kya undo karna hai?");
    if (body.customerId) await undoCustomer(shop.id, body.customerId);
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Undo nahi hua.");
  }
  return Response.json({ ok: true });
}
