export type EntryType = "udhaar" | "payment";

export interface Entry {
  id: string;
  createdAt: string;
  type: EntryType;
  /** Whole rupees. Udhaar increases what the customer owes. */
  amount: number;
  note?: string;
  runningBalance: number;
  transcript?: string;
  dueDate?: string;
  isSample?: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  createdAt: string;
  entries: Entry[];
  balance: number;
  creditLimit?: number;
  isSample?: number;
}

export type ShopKind = "rent" | "bill";
export type ShopStatus = "due" | "paid";
export type BillKind = "bijli" | "paani" | "other";

/** Shop-level rent or utility bill. Not a customer's udhaar. */
export interface ShopRecord {
  id: string;
  createdAt: string;
  kind: ShopKind;
  status: ShopStatus;
  amount: number;
  /** Bijli, Paani, Kiraya, or a short label. */
  label: string;
  billKind?: BillKind;
  note?: string;
  transcript?: string;
  isRecurring?: number;
  recurringDay?: number;
  isSample?: number;
}

export type RentalAssetType = "property" | "equipment" | "other";
export type RatePeriod = "per_day" | "per_week" | "per_month" | "one_time";
export type RentalAssetStatus = "available" | "rented" | "maintenance";
export type RentalAgreementStatus = "active" | "ended";
export type PaymentMode = "cash" | "UPI" | "other";

export interface RentalAsset {
  id: string;
  shopId: string;
  name: string;
  type: RentalAssetType;
  description?: string;
  rate: number;
  ratePeriod: RatePeriod;
  securityDeposit: number;
  status: RentalAssetStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isSample?: number;
}

export interface RentalAgreement {
  id: string;
  shopId: string;
  assetId: string;
  customerId: string;
  startDate: string;
  endDate?: string;
  actualReturnDate?: string;
  rate: number;
  ratePeriod: RatePeriod;
  depositTaken: number;
  depositReturned: number;
  depositDeductions: number;
  depositDeductionReason?: string;
  dueDay?: number;
  status: RentalAgreementStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assetName?: string;
  assetType?: RentalAssetType;
  customerName?: string;
  customerPhone?: string | null;
  isSample?: number;
}

export interface RentalPayment {
  id: string;
  shopId: string;
  agreementId: string;
  customerId: string;
  assetId: string;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  note?: string;
  createdAt: string;
  insertedAt?: string;
  isSample?: number;
}

export interface SupplierPurchase {
  id: string;
  shopId: string;
  supplierName: string;
  supplierPhone?: string;
  itemsText: string;
  amount: number;
  status: "paid" | "pending";
  note?: string;
  createdAt: string;
  insertedAt?: string;
  isSample?: number;
}

export type DraftIntent =
  | "add_customer"
  | "udhaar"
  | "payment"
  | "balance"
  | "rent"
  | "bill"
  | "rent_received"
  | "start_rental"
  | "return_rental"
  | "supplier_purchase";

export interface DraftCard {
  status: "open" | "saved" | "dismissed";
  intent: DraftIntent;
  name: string;
  phone: string;
  customerId?: string;
  ambiguous: { id: string; name: string; balance: number }[];
  amount: string;
  note: string;
  /** yyyy-mm-dd in India. */
  date: string;
  shopStatus: ShopStatus;
  billKind: BillKind;
  label: string;
  hint?: string;
  dueDate?: string;
  assetId?: string;
  agreementId?: string;
  ratePeriod?: RatePeriod;
  deposit?: string;
  paymentMode?: PaymentMode;
  supplierName?: string;
  itemsText?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  card?: DraftCard;
}

export interface Ledger {
  version: 2;
  customers: Customer[];
  shop: ShopRecord[];
  messages: ChatMessage[];
  assets?: RentalAsset[];
  agreements?: RentalAgreement[];
  rentalPayments?: RentalPayment[];
  purchases?: SupplierPurchase[];
}

export function emptyLedger(): Ledger {
  return { version: 2, customers: [], shop: [], messages: [], assets: [], agreements: [], rentalPayments: [], purchases: [] };
}

