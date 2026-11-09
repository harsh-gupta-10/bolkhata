import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { phoneDigits } from "@/lib/confirm";
import { getDb } from "@/lib/db";
import { createCustomer, createRentalAgreement, listRentalAgreements } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const statusParam = (url.searchParams.get("status") as "active" | "ended") || undefined;
  const agreements = await listRentalAgreements(shop.id, statusParam);
  return Response.json({ agreements });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    assetId?: string;
    customerId?: string;
    create?: { name?: string; phone?: string };
    phone?: string;
    startDate?: string;
    endDate?: string | null;
    rate?: number;
    ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
    depositTaken?: number;
    dueDay?: number | null;
    notes?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  if (!body?.assetId) return bad("Asset chuno.");
  if (!body?.startDate) return bad("Start date zaroori hai.");

  let customerId = body.customerId;
  const phone = phoneDigits(body.phone ?? body.create?.phone);

  if (!customerId && body.create?.name) {
    if (body.create.name.trim().length < 2) return bad("Naam theek se likho.");
    if (!phone) return bad("10 digit phone confirm karo.");
    const created = await createCustomer(shop.id, { name: body.create.name, phone });
    customerId = created.id;
  }

  if (!customerId) return bad("Grahak / kirayedaar chuno.");

  // Verify customer belongs to shop and has phone
  const db = await getDb();
  const person = await db.get<{ name: string; phone: string | null }>(
    `SELECT name, phone FROM customers WHERE id = ? AND shop_id = ?`,
    customerId,
    shop.id,
  );
  if (!person) return bad("Grahak is dukaan ka nahi hai.");
  if (!person.phone) return bad("10 digit phone zaroori hai.");

  let rate: number | undefined;
  if (body.rate != null) {
    const parsed = wholeRupees(body.rate);
    if (parsed == null) return bad("Rate poora rupay ho.");
    rate = parsed;
  }

  let depositTaken: number | undefined;
  if (body.depositTaken != null) {
    const parsed = wholeRupees(body.depositTaken);
    if (parsed == null) return bad("Deposit poora rupay ho.");
    depositTaken = parsed;
  }

  try {
    const agreement = await createRentalAgreement(shop.id, {
      assetId: body.assetId,
      customerId,
      startDate: body.startDate,
      endDate: body.endDate,
      rate,
      ratePeriod: body.ratePeriod,
      depositTaken,
      dueDay: body.dueDay,
      notes: body.notes,
    });
    return Response.json({ ok: true, agreement, agreementId: agreement.id });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Agreement nahi bana.");
  }
}
