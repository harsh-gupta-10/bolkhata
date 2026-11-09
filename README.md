# BolKhata (बोलखाता) — Voice-First Digital Khata & Rentals for Kirana Shops

BolKhata is a mobile-first, voice-first Hinglish digital ledger (khata) designed specifically for Indian kirana shop owners. It empowers shopkeepers to effortlessly track **Udhaar** (credit), **Jama** (payments), **Kiraya Diya** (shop rent & utility bills), **Kiraya Mila** (rentals income & equipment lending), **Supplier Purchases** (stock purchases & price history), and **Daily Cash Summaries** through conversational voice or quick touch inputs.

---

## 🌟 Key Features

### 1. Rentals ("Kiraya Par Diya" — Things the Shopkeeper Rents Out)
- **Rental Assets:** Track rentable assets across types:
  - `property`: Rooms, shops, godowns, flats
  - `equipment`: Atta chakki, freezer, generator, tent/chairs, weighing machine, cycle
  - `other`: Specialized shop tools
  - Fields include rate amount, rate period (`per_day`, `per_week`, `per_month`, `one_time`), security deposit, status (`available`, `rented`, `maintenance`), and notes.
- **Tenants & Agreements:**
  - Links assets to renters (reuses customer entity; enforces name + validated 10-digit phone).
  - **Short rentals (equipment):** Tracks start date and expected return date; on return, computes elapsed days, late return days, daily rate charge, and deposit refund.
  - **Long rentals (property):** Generates monthly rent schedule based on start date and due day of month.
- **Rent Collection & Money Safety:**
  - Record rent receipts (cash, UPI, other) with partial payments.
  - Track **due, paid, and pending** per agreement and per month.
  - **Overdue tracking:** Highlights overdue days when rent schedule passes unpaid.
  - **Security deposit isolation:** Deposits are tracked independently and strictly separated from rental income.
  - **Transfer to Udhaar:** One-tap confirmed action to transfer unpaid rental dues into the renter's customer ledger.
- **Dedicated Rentals UI:**
  - Summary KPI cards: *This Month Expected*, *Collected*, *Pending*, *Overdue Count*, *Deposits Held*.
  - Tabbed toggle between **Kiraya Mila / Rentals (Income)** and **Kiraya Diya / Shop Rent (Expense)**.

### 2. High-Priority Shopkeeper Features
- **Udhaar Due Dates ("Kab tak dega"):**
  - Add promised repayment dates to udhaar lines.
  - Amber/red **Overdue** badges when due date has passed.
  - One-tap **WhatsApp** (`https://wa.me/91...`) and **SMS** reminder links prefilled with friendly Hinglish balance reminders.
- **Credit Limit Per Customer:**
  - Set optional credit limits per customer.
  - Real-time warning banner in draft confirmation card when a new udhaar exceeds their credit limit.
- **Aaj Ka Hisaab (Daily Cash Summary):**
  - Read-only real-time cash drawer breakdown for today (Asia/Kolkata IST).
  - Displays **Cash In** (customer jama payments + rental collections), **Cash Out** (shop bills + supplier purchases), and **Net Cash**.
- **Supplier & Stock Purchases Book (`supplier_purchases`):**
  - Track purchases from vendors and wholesale mandis.
  - Smart price intelligence: When typing an item name, instantly shows: *"Pichli baar khareeda tha: [DATE] ko ₹[RATE]"*.
  - Status toggle (`paid` / `pending`) with 8-second undo toast.
- **Recurring Shop Bills & Rent:**
  - Mark landlord rent or utility bills as recurring with monthly due days (1–31).
  - One-tap **Mark Paid** action to clear dues.
- **Global Search:**
  - Header search box with instant autocomplete dropdown searching across customers, renters, rental assets, agreements, bills, supplier purchases, and shop memory notes.
- **Monthly Statement View (Hisaab Parchi):**
  - Clean printable statement view per customer showing opening balance, line items, and closing balance.
  - Print/PDF export (`window.print()`) and session-gated CSV export.
- **Session-Gated RFC 4180 CSV Export:**
  - Export full books (`udhaar`, `jama`, `rent`, `bills`, `rentals`, `suppliers`) or individual customer ledgers to CSV.

---

## 🎙️ Voice & AI Integration

- **Speech-to-Text (STT):** Powered by **Gnani Prisma v2.5** (`POST /api/stt`, `hi-IN`, `format=transcribe`). Audio is decoded in-browser to 16-bit mono 16kHz WAV (`recording.wav`).
- **Text-to-Speech (TTS):** Powered by **Gnani Timbre v2.5** (`POST /api/tts`, voice `Poorvi`, language `hi-en`). Rupee amounts are spoken naturally as Hindi numbers (`₹250` -> `do sau pachaas rupay`).
- **Interpret Layer:** `POST /api/interpret` sends queries to OpenAI (`gpt-4o-mini`) when `OPENAI_API_KEY` is present.
- **Deterministic Rule Fallback Parser:** If OpenAI key is missing or fails, a robust in-app Hinglish rule parser handles all intents without downtime.

### Voice Command Examples
- **Rent Received:** `"Sharma ji ne kamre ka 5000 kiraya diya"`
- **Start Equipment Rental:** `"Chakki Ramesh ko 3 din ke liye di, 200 roz"`
- **Return Rental:** `"Ramesh ne chakki wapas kar di"`
- **Overdue Rent Query:** `"Kiska kiraya baaki hai?"`
- **Customer Udhaar:** `"Ramesh ko 250 rupay udhaar, atta 5 kilo"`
- **Customer Jama:** `"Ramesh ne 500 rupay jama kiye"`
- **Customer Balance:** `"Ramesh ka balance kitna hai?"`
- **New Customer:** `"Add Ramesh Kumar, 90000 11111"`

---

## 🛡️ Money Safety Rules

1. **Chat/Voice Drafts Only:** Voice or chat NEVER writes directly to the database. Every action creates an explicit draft card that requires tapping **Confirm**.
2. **Server-Side Identity Validation:** Any money tied to an individual requires name and a full 10-digit Indian phone number (`/^[6-9]\d{9}$/`), enforced on both client and server.
3. **Whole Rupees Only:** Ledger and rental calculations strictly enforce integer rupees; floats (`12.50`), negatives, non-numeric values, or scientific notations are rejected.
4. **8-Second Undo Window:** Every money write (entries, rental payments, supplier purchases) triggers an 8-second undo toast allowing instantaneous reversal.
5. **No Hallucinated Contacts:** The system never invents contacts or phone numbers.

---

## 🏗️ Architecture & Stack

- **Framework:** Next.js (App Router) deployed to **Cloudflare Workers via vinext** (not OpenNext).
- **Database:** **Cloudflare D1** (SQLite at the edge, binding `DB`).
- **Authentication:** D1-backed sessions via httpOnly cookie `bolkhata_session`, plus Google Sign-in with Firebase Auth token verification.
- **Styling & Components:** Tailwind CSS v4, Base UI, Lucide icons.
- **Timezone:** Standardized on `Asia/Kolkata` (IST) for business dates and ISO timestamps.
- **Internationalization:** Full bilingual Hinglish (default) and English translations in `lib/i18n.ts`.

---

## 📊 Database Schema & Additive Migrations

All schema changes are additive to preserve existing data.

### Migrations
- `migrations/0001_rentals_and_features.sql`:
  - `rental_assets`: id, shop_id, name, type, description, rate, rate_period, security_deposit, status, notes, created_at, updated_at
  - `rental_agreements`: id, shop_id, asset_id, customer_id, start_date, end_date, actual_return_date, rate, rate_period, deposit_taken, deposit_returned, deposit_deductions, deposit_deduction_reason, due_day, status, notes, created_at, updated_at
  - `rental_payments`: id, shop_id, agreement_id, customer_id, asset_id, amount, payment_date, mode, note, created_at, inserted_at
  - `supplier_purchases`: id, shop_id, supplier_name, supplier_phone, items_text, amount, status, note, created_at, inserted_at
  - `ALTER TABLE entries ADD COLUMN due_date TEXT;`
  - `ALTER TABLE customers ADD COLUMN credit_limit INTEGER DEFAULT 0;`
  - `ALTER TABLE shop_records ADD COLUMN is_recurring INTEGER DEFAULT 0;`
  - `ALTER TABLE shop_records ADD COLUMN recurring_day INTEGER;`

To apply to remote Cloudflare D1:
```bash
npx wrangler d1 execute bolkhata --remote --file=migrations/0001_rentals_and_features.sql
```

---

## 🧪 Testing

The repository features comprehensive unit tests covering pure financial calculations, parser rules, ledger math, and voice interpretations:

```bash
npx vitest run
```

Result: **51 tests passed** across 8 test suites.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run test suite
npm test

# Build for production
npm run build
```

---

## 🌐 Live Application & Cloudflare Deployment

- **Live Cloudflare Workers App:** [https://bolkhata.harshgupta24716.workers.dev](https://bolkhata.harshgupta24716.workers.dev)
- **Cloudflare Account ID:** `b1d481965d10a5b83a86f3ba67c2e0ed`
- **Cloudflare D1 Database ID:** `03b9667a-d1b1-4124-88a8-fe9e8bc3a561`
- **Binding Name:** `DB`
