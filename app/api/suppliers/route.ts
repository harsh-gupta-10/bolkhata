import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { createSupplierPurchase, listSupplierPurchases } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const statusParam = (url.searchParams.get("status") as "paid" | "pending") || undefined;
  const purchases = await listSupplierPurchases(shop.id, statusParam);
  return Response.json({ purchases });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    supplierName?: string;
    supplierPhone?: string;
    itemsText?: string;
    amount?: number;
    status?: "paid" | "pending";
    note?: string;
    createdAt?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");

  const supplierName = body?.supplierName?.trim() ?? "";
  if (supplierName.length < 2) return bad("Supplier ka naam likho.");

  const itemsText = body?.itemsText?.trim() ?? "";
  if (itemsText.length < 1) return bad("Items ka vivaran likho.");

  const amount = wholeRupees(body?.amount);
  if (amount == null) return bad("Poora rupay amount likho.");

  const status = body?.status === "paid" ? "paid" : "pending";

  try {
    const saved = await createSupplierPurchase(shop.id, {
      supplierName,
      supplierPhone: body?.supplierPhone,
      itemsText,
      amount,
      status,
      note: body?.note,
      createdAt: body?.createdAt,
    });
    return Response.json({ ok: true, purchaseId: saved.id });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Purchase likha nahi gaya.");
  }
}
