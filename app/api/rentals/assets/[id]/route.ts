import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { getRentalAsset, updateRentalAsset } from "@/lib/repo";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const asset = await getRentalAsset(shop.id, id);
  if (!asset) return bad("Asset nahi mila.");
  return Response.json({ asset });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    type?: "property" | "equipment" | "other";
    description?: string;
    rate?: number;
    ratePeriod?: "per_day" | "per_week" | "per_month" | "one_time";
    securityDeposit?: number;
    status?: "available" | "rented" | "maintenance";
    notes?: string;
  } | null;

  let rate: number | undefined;
  if (body?.rate != null) {
    const parsed = wholeRupees(body.rate);
    if (parsed == null) return bad("Rate poora rupay ho.");
    rate = parsed;
  }

  let securityDeposit: number | undefined;
  if (body?.securityDeposit != null) {
    const parsed = wholeRupees(body.securityDeposit);
    if (parsed == null) return bad("Security deposit poora rupay ho.");
    securityDeposit = parsed;
  }

  try {
    await updateRentalAsset(shop.id, id, {
      name: body?.name,
      type: body?.type,
      description: body?.description,
      rate,
      ratePeriod: body?.ratePeriod,
      securityDeposit,
      status: body?.status,
      notes: body?.notes,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Asset update nahi hua.");
  }
}
