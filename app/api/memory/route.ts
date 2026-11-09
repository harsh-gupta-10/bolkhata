import { bad, isShop, requireShop } from "@/lib/api";
import { deleteMemory, listCustomers, saveUserNote } from "@/lib/repo";

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    customerId?: string;
    name?: string;
    phone?: string;
    note?: string;
    intent?: string;
    amount?: number;
    balance?: number;
  } | null;
  const name = body?.name?.trim() ?? "";
  if (name.length < 2) return bad("Naam likho.");
  const customers = await listCustomers(shop.id);
  const linked = body?.customerId ? customers.find((customer) => customer.id === body.customerId) : customers.find((customer) => customer.name.toLowerCase() === name.toLowerCase());
  const customerId = linked?.id ?? (body?.customerId?.trim() || `note:${crypto.randomUUID()}`);
  await saveUserNote(shop.id, {
    customerId,
    name: linked?.name ?? name,
    phone: linked?.phone ?? body?.phone ?? null,
    note: body?.note?.trim() || body?.intent?.trim() || "note",
  });
  return Response.json({ ok: true, customerId });
}

export async function DELETE(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const customerId = new URL(request.url).searchParams.get("customerId")?.trim() ?? "";
  if (!customerId) return bad("Yaad nahi mili.");
  await deleteMemory(shop.id, customerId);
  return Response.json({ ok: true });
}
