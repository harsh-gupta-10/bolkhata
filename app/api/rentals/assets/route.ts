import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { createRentalAsset, listRentalAssets } from "@/lib/repo";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") || undefined;
  const assets = await listRentalAssets(shop.id, statusParam);
  return Response.json({ assets });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    type?: string;
    description?: string;
    rate?: number;
    ratePeriod?: string;
    securityDeposit?: number;
    notes?: string;
  } | null;

  const name = body?.name?.trim() ?? "";
  if (name.length < 2) return bad("Asset ka naam likho.");

  const type = body?.type;
  if (type !== "property" && type !== "equipment" && type !== "other") {
    return bad("Type chuno: property, equipment, ya other.");
  }

  const rate = wholeRupees(body?.rate);
  if (rate == null) return bad("Poora rupay rate likho.");

  const ratePeriod = body?.ratePeriod;
  if (ratePeriod !== "per_day" && ratePeriod !== "per_week" && ratePeriod !== "per_month" && ratePeriod !== "one_time") {
    return bad("Rate period chuno: per_day, per_week, per_month, ya one_time.");
  }

  const deposit = body?.securityDeposit != null ? wholeRupees(body.securityDeposit) : 0;
  if (deposit == null) return bad("Security deposit poora rupay ho.");

  try {
    const asset = await createRentalAsset(shop.id, {
      name,
      type,
      description: body?.description,
      rate,
      ratePeriod,
      securityDeposit: deposit,
      notes: body?.notes,
    });
    return Response.json({ ok: true, asset, assetId: asset.id });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Asset nahi bana.");
  }
}
