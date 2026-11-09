import { bad, isShop, requireShop } from "@/lib/api";
import { createCustomer, listCustomers } from "@/lib/repo";

export async function GET() {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  return Response.json({ customers: await listCustomers(shop.id) });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as { name?: string; phone?: string; creditLimit?: number } | null;
  const name = body?.name?.trim() ?? "";
  if (name.length < 2) return bad("Naam kam se kam do akshar ka ho.");
  try {
    const customer = await createCustomer(shop.id, { name, phone: body?.phone, creditLimit: body?.creditLimit });
    return Response.json({ customer, customerId: customer.id });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Grahak nahi bana.");
  }
}
