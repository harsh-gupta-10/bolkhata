import { cookies } from "next/headers";
import { phoneDigits } from "@/lib/confirm";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "bolkhata_session";
const MONTH = 60 * 60 * 24 * 30;

export interface Shop {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  locale: string | null;
}

export async function readShop(): Promise<Shop | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const now = new Date().toISOString();
  return db.get<Shop>(
    `SELECT shops.id, shops.name, shops.owner_name, shops.email, shops.phone, shops.created_at, shops.locale
     FROM sessions JOIN shops ON shops.id = sessions.shop_id
     WHERE sessions.id = ? AND sessions.expires_at > ?`,
    token,
    now,
  );
}

export async function startSession(shopId: string): Promise<void> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const created = new Date();
  const expires = new Date(created.getTime() + MONTH * 1000);
  await db.run(
    `INSERT INTO sessions (id, shop_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    id,
    shopId,
    created.toISOString(),
    expires.toISOString(),
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MONTH,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.run(`DELETE FROM sessions WHERE id = ?`, token);
  }
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string | null | undefined): string | null {
  return phoneDigits(phone);
}
