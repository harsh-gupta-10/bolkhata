export interface PickedContact {
  name: string;
  phone?: string;
}

interface ContactRecord {
  name?: string[];
  tel?: string[];
}

export function contactPickerAvailable(): boolean {
  if (typeof navigator === "undefined") return false;
  const contacts = (navigator as Navigator & { contacts?: { select?: unknown } }).contacts;
  return typeof contacts?.select === "function";
}

export async function pickContacts(): Promise<PickedContact[]> {
  const contacts = (navigator as Navigator & {
    contacts: { select: (props: string[], options?: { multiple?: boolean }) => Promise<ContactRecord[]> };
  }).contacts;
  const records = await contacts.select(["name", "tel"], { multiple: true });
  return records
    .map((record) => ({
      name: (record.name?.[0] ?? "").trim(),
      phone: record.tel?.[0],
    }))
    .filter((record) => record.name.length >= 2);
}
