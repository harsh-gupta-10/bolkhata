/**
 * Pure calculation logic for rentals (property and equipment).
 * All dates are handled in Asia/Kolkata (IST).
 * Security deposits are strictly separated and NEVER counted as rental income.
 */

export interface EquipmentCalcResult {
  plannedDays: number;
  totalDays: number;
  lateDays: number;
  dailyRate: number;
  totalAmount: number;
  isOverdue: boolean;
  daysOverdue: number;
  daysUsed: number;
  rentalCharge: number;
  depositToRefund: number;
}

export interface RentScheduleItem {
  periodKey: string; // "2026-11"
  periodLabel: string; // "November 2026"
  dueDate: string; // "2026-11-05"
  amount: number;
}

export interface AgreementFinancials {
  totalExpected: number;
  totalCollected: number;
  totalPending: number;
  isOverdue: boolean;
  daysOverdue: number;
  depositTaken: number;
  depositReturned: number;
  depositDeductions: number;
  depositHeld: number; // Deposit is NEVER counted as income
  schedules: RentScheduleItem[];
  thisMonthExpected: number;
  thisMonthCollected: number;
  thisMonthPending: number;
  pending: number;
  totalDue: number;
  totalPaid: number;
  overdue: boolean;
  overdueDays: number;
}

export interface RentalsOverview {
  thisMonthExpected: number;
  thisMonthCollected: number;
  thisMonthPending: number;
  overdueCount: number;
  depositsHeld: number;
  expectedThisMonth: number;
  collectedThisMonth: number;
  pendingThisMonth: number;
  overdueAgreementsCount: number;
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata (IST).
 */
export function getIstTodayString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Difference in calendar days between two YYYY-MM-DD dates (d2 - d1).
 */
export function diffCalendarDays(d1: string, d2: string): number {
  const p1 = d1.split("-").map(Number);
  const p2 = d2.split("-").map(Number);
  const utc1 = Date.UTC(p1[0], p1[1] - 1, p1[2]);
  const utc2 = Date.UTC(p2[0], p2[1] - 1, p2[2]);
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to YYYY-MM-DD.
 */
export function addDays(dateStr: string, days: number): string {
  const p = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a YYYY-MM into a human-readable period label in IST (e.g. "November 2026").
 */
export function formatMonthPeriod(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 15));
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}

/**
 * Short rentals (equipment):
 * Computes days, late days, and total amount at daily rate.
 * - Same day return counts as 1 day minimum.
 * - If returned after expected return date, late days are computed and charged.
 */
export function calculateEquipmentRental(input: {
  startDate: string;
  expectedEndDate?: string | null;
  actualReturnDate?: string | null;
  actualEndDate?: string | null;
  dailyRate?: number;
  rateAmount?: number;
  rate?: number;
  ratePeriod?: string;
  asOfDate?: string;
  depositAmount?: number;
  deductions?: number;
}): EquipmentCalcResult {
  const rate = Math.max(0, Math.round(Number(input.dailyRate ?? input.rateAmount ?? input.rate) || 0));
  const asOf = input.asOfDate || getIstTodayString();
  const start = input.startDate.slice(0, 10);
  const expected = input.expectedEndDate ? input.expectedEndDate.slice(0, 10) : null;
  const returned = input.actualReturnDate
    ? input.actualReturnDate.slice(0, 10)
    : input.actualEndDate
      ? input.actualEndDate.slice(0, 10)
      : null;

  // Planned days (if expectedEndDate specified)
  const plannedDays = expected ? Math.max(1, diffCalendarDays(start, expected)) : 1;

  // The effective date when equipment is returned, or current date if still active
  const effectiveEndDate = returned || asOf;
  const daysDiff = diffCalendarDays(start, effectiveEndDate);
  const totalDays = Math.max(1, daysDiff);

  // Late days
  let lateDays = 0;
  if (expected) {
    const compareDate = returned || asOf;
    const diffFromExpected = diffCalendarDays(expected, compareDate);
    if (diffFromExpected > 0) {
      lateDays = diffFromExpected;
    }
  }

  const totalAmount = totalDays * rate;

  // Overdue check: active (not returned yet) and today > expectedEndDate
  let isOverdue = false;
  let daysOverdue = 0;
  if (!returned && expected) {
    const diff = diffCalendarDays(expected, asOf);
    if (diff > 0) {
      isOverdue = true;
      daysOverdue = diff;
    }
  }

  const daysUsed = totalDays;
  const rentalCharge = totalAmount;
  const dep = Math.max(0, Math.round(Number(input.depositAmount) || 0));
  const ded = Math.max(0, Math.round(Number(input.deductions) || 0));
  const depositToRefund = Math.max(0, dep - ded - totalAmount);

  return {
    plannedDays,
    totalDays,
    lateDays,
    dailyRate: rate,
    totalAmount,
    isOverdue,
    daysOverdue,
    daysUsed,
    rentalCharge,
    depositToRefund,
  };
}

/**
 * Monthly property rent schedule:
 * Generates monthly rent schedule starting from startDate up to asOfDate (or endDate if ended).
 */
export function generateRentSchedule(input: {
  startDate: string;
  endDate?: string | null;
  monthlyRate: number;
  dueDay?: number | null;
  asOfDate?: string;
}): RentScheduleItem[] {
  const rate = Math.max(0, Math.round(input.monthlyRate));
  const dueDay = Math.min(31, Math.max(1, Number(input.dueDay) || 1));
  const start = input.startDate.slice(0, 10);
  const endLimit = input.endDate ? input.endDate.slice(0, 10) : null;
  const asOf = input.asOfDate || getIstTodayString();

  const [startYear, startMonth] = start.split("-").map(Number);
  const targetEnd = endLimit && endLimit < asOf ? endLimit : asOf;
  const [endYear, endMonth] = targetEnd.split("-").map(Number);

  const schedules: RentScheduleItem[] = [];

  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const periodKey = `${y}-${String(m).padStart(2, "0")}`;
    const periodLabel = formatMonthPeriod(y, m);

    // Days in month
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const actualDueDay = Math.min(dueDay, daysInMonth);
    const dueDate = `${y}-${String(m).padStart(2, "0")}-${String(actualDueDay).padStart(2, "0")}`;

    schedules.push({
      periodKey,
      periodLabel,
      dueDate,
      amount: rate,
    });

    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return schedules;
}

/**
 * Computes complete financial picture of an agreement:
 * - Total expected to date
 * - Total collected
 * - Total pending
 * - Overdue determination (days overdue)
 * - Security deposit held (kept strictly outside income!)
 * - This month's figures
 */
export function computeAgreementFinancials(
  inputOrAg: any,
  maybePayments?: any[],
  asOfDateParam?: string,
): AgreementFinancials {
  const isDirect =
    Array.isArray(maybePayments) ||
    ("asset_id" in inputOrAg) ||
    ("customer_id" in inputOrAg) ||
    ("start_date" in inputOrAg);

  const input = isDirect
    ? {
        rate: inputOrAg.rate ?? inputOrAg.rate_amount ?? 0,
        ratePeriod: inputOrAg.rate_period ?? inputOrAg.ratePeriod ?? "per_month",
        startDate: inputOrAg.start_date ?? inputOrAg.startDate,
        endDate: inputOrAg.end_date ?? inputOrAg.endDate ?? null,
        expectedEndDate: inputOrAg.expected_end_date ?? inputOrAg.expectedEndDate ?? null,
        actualReturnDate: inputOrAg.actual_return_date ?? inputOrAg.actualReturnDate ?? null,
        dueDay: inputOrAg.due_day ?? inputOrAg.dueDay ?? null,
        depositTaken: inputOrAg.deposit_taken ?? inputOrAg.deposit_amount ?? inputOrAg.depositTaken ?? 0,
        depositReturned: inputOrAg.deposit_returned ?? inputOrAg.depositReturned ?? 0,
        depositDeductions: inputOrAg.deposit_deductions ?? inputOrAg.depositDeductions ?? 0,
        payments: (maybePayments || inputOrAg.payments || []).map((p: any) => ({
          amount: p.amount,
          paymentDate: p.payment_date ?? p.paymentDate,
        })),
        asOfDate: asOfDateParam || inputOrAg.asOfDate,
      }
    : inputOrAg;

  const asOf = input.asOfDate || getIstTodayString();
  const currentMonthKey = asOf.slice(0, 7); // "YYYY-MM"
  const endLimitDate = input.endDate ?? input.expectedEndDate ?? null;

  // Security deposit calculation (NEVER counted as income)
  const depositTaken = Math.max(0, Math.round(Number(input.depositTaken) || 0));
  const depositReturned = Math.max(0, Math.round(Number(input.depositReturned) || 0));
  const depositDeductions = Math.max(0, Math.round(Number(input.depositDeductions) || 0));
  const depositHeld = Math.max(0, depositTaken - depositReturned - depositDeductions);

  // Total collected from rent payments
  const paymentsList: Array<{ amount: number; paymentDate?: string }> = input.payments || [];
  const totalCollected = paymentsList.reduce((sum, p) => sum + Math.max(0, Math.round(Number(p.amount) || 0)), 0);

  // Payments made in current month
  const thisMonthCollected = paymentsList
    .filter((p) => p.paymentDate && p.paymentDate.slice(0, 7) === currentMonthKey)
    .reduce((sum, p) => sum + Math.max(0, Math.round(Number(p.amount) || 0)), 0);

  let totalExpected = 0;
  let isOverdue = false;
  let daysOverdue = 0;
  let schedules: RentScheduleItem[] = [];
  let thisMonthExpected = 0;

  if (input.ratePeriod === "per_day") {
    // Short / Equipment rental
    const calc = calculateEquipmentRental({
      startDate: input.startDate,
      expectedEndDate: endLimitDate,
      actualReturnDate: input.actualReturnDate,
      dailyRate: input.rate,
      asOfDate: asOf,
    });
    totalExpected = calc.totalAmount;
    isOverdue = calc.isOverdue || (totalExpected > totalCollected && Boolean(endLimitDate && asOf > endLimitDate));
    if (isOverdue) {
      const dueTarget = endLimitDate ? endLimitDate.slice(0, 10) : asOf;
      daysOverdue = Math.max(1, diffCalendarDays(dueTarget, asOf));
    }
    thisMonthExpected = totalExpected;
  } else if (input.ratePeriod === "per_month") {
    // Monthly property rental
    schedules = generateRentSchedule({
      startDate: input.startDate,
      endDate: endLimitDate,
      monthlyRate: input.rate,
      dueDay: input.dueDay,
      asOfDate: asOf,
    });

    totalExpected = schedules.reduce((sum, s) => sum + s.amount, 0);

    const thisMonthSchedule = schedules.find((s) => s.periodKey === currentMonthKey);
    thisMonthExpected = thisMonthSchedule ? thisMonthSchedule.amount : 0;

    // Overdue check
    const passedSchedules = schedules.filter((s) => s.dueDate <= asOf);
    const passedAmount = passedSchedules.reduce((sum, s) => sum + s.amount, 0);

    if (totalCollected < passedAmount) {
      isOverdue = true;
      let runningPaid = totalCollected;
      let oldestUnpaidDueDate = asOf;
      for (const s of passedSchedules) {
        if (runningPaid >= s.amount) {
          runningPaid -= s.amount;
        } else {
          oldestUnpaidDueDate = s.dueDate;
          break;
        }
      }
      daysOverdue = Math.max(1, diffCalendarDays(oldestUnpaidDueDate, asOf));
    }
  } else {
    // one_time or per_week
    totalExpected = Math.max(0, Math.round(Number(input.rate) || 0));
    thisMonthExpected = totalExpected;
    if (totalCollected < totalExpected && input.endDate && asOf > input.endDate) {
      isOverdue = true;
      daysOverdue = Math.max(1, diffCalendarDays(input.endDate.slice(0, 10), asOf));
    }
  }

  const totalPending = Math.max(0, totalExpected - totalCollected);
  const thisMonthPending = Math.max(0, thisMonthExpected - thisMonthCollected);

  return {
    totalExpected,
    totalCollected,
    totalPending,
    isOverdue,
    daysOverdue,
    depositTaken,
    depositReturned,
    depositDeductions,
    depositHeld,
    schedules,
    thisMonthExpected,
    thisMonthCollected,
    thisMonthPending,
    pending: totalPending,
    totalDue: totalExpected,
    totalPaid: totalCollected,
    overdue: isOverdue,
    overdueDays: daysOverdue,
  };
}

/**
 * Computes shop-wide summary across all rental agreements.
 */
export function computeRentalsOverview(
  agreementsOrAssets: any,
  maybeAgreements?: any[],
  maybePayments?: any[],
): RentalsOverview {
  let agreementsFinancials: AgreementFinancials[] = [];
  if (Array.isArray(maybeAgreements) && Array.isArray(maybePayments)) {
    const payments = maybePayments;
    agreementsFinancials = maybeAgreements.map((ag) =>
      computeAgreementFinancials(
        ag,
        payments.filter((p: any) => p.agreement_id === ag.id || p.agreementId === ag.id),
      ),
    );
  } else if (Array.isArray(agreementsOrAssets)) {
    agreementsFinancials = agreementsOrAssets;
  }

  let thisMonthExpected = 0;
  let thisMonthCollected = 0;
  let overdueCount = 0;
  let depositsHeld = 0;

  for (const a of agreementsFinancials) {
    thisMonthExpected += a.thisMonthExpected;
    thisMonthCollected += a.thisMonthCollected;
    depositsHeld += a.depositHeld;
    if (a.isOverdue && a.totalPending > 0) {
      overdueCount++;
    }
  }

  const thisMonthPending = Math.max(0, thisMonthExpected - thisMonthCollected);

  return {
    thisMonthExpected,
    thisMonthCollected,
    thisMonthPending,
    overdueCount,
    depositsHeld,
    expectedThisMonth: thisMonthExpected,
    collectedThisMonth: thisMonthCollected,
    pendingThisMonth: thisMonthPending,
    overdueAgreementsCount: overdueCount,
  };
}

export const computeEquipmentRentalCost = calculateEquipmentRental;
export const computeShopRentalsSummary = computeRentalsOverview;


