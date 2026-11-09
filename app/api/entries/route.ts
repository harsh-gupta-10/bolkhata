import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { phoneDigits } from "@/lib/confirm";
import { addEntry, createCustomer, listEntries } from "@/lib/repo";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const type = new URL(request.url).searchParams.get("type");
  const filter = type === "udhaar" || type === "payment" ? type : undefined;
  return Response.json({ entries: await listEntries(shop.id, filter) });
}

export async function POST(request: Request) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const body = (await request.json().catch(() => null)) as {
    customerId?: string;
    create?: { name?: string; phone?: string };
    phone?: string;
    type?: string;
    amount?: number;
    note?: string;
    transcript?: string;
    createdAt?: string;
    confirmed?: boolean;
    name?: string;
    dueDate?: string;
  } | null;
  if (body?.confirmed !== true) return bad("Pehle confirm karo.");
  if (body?.type !== "udhaar" && body?.type !== "payment") return bad("Udhaar ya jama chuno.");
  const amount = wholeRupees(body.amount);
  if (amount == null) return bad("Poora rupay amount likho. Decimal ya minus nahi.");
  const phone = phoneDigits(body.phone ?? body.create?.phone);
  if (!phone) return bad("10 digit phone confirm karo.");
  let customerId = body.customerId;
  let createdCustomerId: string | undefined;
  try {
    if (!customerId && body.create?.name) {
      if (body.create.name.trim().length < 2) return bad("Naam confirm karo.");
      const created = await createCustomer(shop.id, { name: body.create.name, phone });
      customerId = created.id;
      createdCustomerId = created.id;
    }
    if (!customerId) return bad("Pehle grahak confirm karo.");
    const db = await getDb();
    const person = await db.get<{ name: string; phone: string | null }>(`SELECT name, phone FROM customers WHERE id = ? AND shop_id = ?`, customerId, shop.id);
    if (!person) return bad("Grahak is dukaan ka nahi hai.");
    if (phoneDigits(person.phone) !== phone) return bad("Phone match nahi hua.");
    if (body.name && body.name.trim().toLowerCase() !== person.name.trim().toLowerCase()) return bad("Naam match nahi hua.");
    const saved = await addEntry(shop.id, {
      customerId,
      type: body.type,
      amount,
      note: body.note,
      transcript: body.transcript,
      createdAt: body.createdAt,
      dueDate: body.dueDate,
    });
    return Response.json({ ok: true, entryId: saved.id, customerId, createdCustomerId, balance: saved.balance });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Likha nahi gaya.");
  }
}
