import { bad, isShop, requireShop, wholeRupees } from "@/lib/api";
import { computeAgreementFinancials } from "@/lib/rentals-math";
import { endRentalAgreement, getRentalAgreement, listRentalPayments } from "@/lib/repo";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const agreement = await getRentalAgreement(shop.id, id);
  if (!agreement) return bad("Agreement nahi mila.");

  const payments = await listRentalPayments(shop.id, id);
  const financials = computeAgreementFinancials({
    rate: agreement.rate,
    ratePeriod: agreement.rate_period,
    startDate: agreement.start_date,
    endDate: agreement.end_date,
    actualReturnDate: agreement.actual_return_date,
    dueDay: agreement.due_day,
    depositTaken: agreement.deposit_taken,
    depositReturned: agreement.deposit_returned,
    depositDeductions: agreement.deposit_deductions,
    payments: payments.map((p) => ({ amount: p.amount, paymentDate: p.payment_date })),
  });

  return Response.json({ agreement, payments, financials });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const shop = await requireShop();
  if (!isShop(shop)) return shop;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "end";
    depositReturned?: number;
    depositDeductions?: number;
    depositDeductionReason?: string;
    confirmed?: boolean;
  } | null;

  if (body?.confirmed !== true) return bad("Pehle confirm karo.");

  let depositReturned: number | undefined;
  if (body?.depositReturned != null) {
    const parsed = wholeRupees(body.depositReturned);
    if (parsed == null) return bad("Returned deposit poora rupay ho.");
    depositReturned = parsed;
  }

  let depositDeductions: number | undefined;
  if (body?.depositDeductions != null) {
    const parsed = wholeRupees(body.depositDeductions);
    if (parsed == null) return bad("Deduction amount poora rupay ho.");
    depositDeductions = parsed;
  }

  try {
    await endRentalAgreement(shop.id, id, {
      depositReturned,
      depositDeductions,
      depositDeductionReason: body?.depositDeductionReason,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return bad(error instanceof Error ? error.message : "Agreement end nahi hua.");
  }
}
