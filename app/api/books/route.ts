import { isShop, requireShop } from "@/lib/api";
import {
  getDailyCashSummary,
  listCustomers,
  listEntries,
  listMemory,
  listMessages,
  listRecords,
  listRentalAgreements,
  listRentalAssets,
  listRentalPayments,
  listSupplierPurchases,
} from "@/lib/repo";

export async function GET() {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const [customers, entries, records, messages, memory, assets, agreements, rentalPayments, purchases, dailySummary] = await Promise.all([
    listCustomers(shop.id),
    listEntries(shop.id),
    listRecords(shop.id),
    listMessages(shop.id),
    listMemory(shop.id),
    listRentalAssets(shop.id),
    listRentalAgreements(shop.id),
    listRentalPayments(shop.id),
    listSupplierPurchases(shop.id),
    getDailyCashSummary(shop.id),
  ]);
  return Response.json({
    shop,
    customers,
    entries,
    records,
    messages,
    memory,
    assets,
    agreements,
    rentalPayments,
    purchases,
    dailySummary,
  });
}

