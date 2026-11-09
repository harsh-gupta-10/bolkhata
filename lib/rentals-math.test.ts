import { describe, expect, it } from "vitest";
import {
  calculateEquipmentRental,
  computeAgreementFinancials,
  computeRentalsOverview,
  diffCalendarDays,
  generateRentSchedule,
} from "./rentals-math";

describe("rentals-math", () => {
  describe("diffCalendarDays", () => {
    it("computes difference correctly between two dates", () => {
      expect(diffCalendarDays("2026-11-01", "2026-11-04")).toBe(3);
      expect(diffCalendarDays("2026-11-04", "2026-11-01")).toBe(-3);
      expect(diffCalendarDays("2026-11-01", "2026-11-01")).toBe(0);
    });
  });

  describe("calculateEquipmentRental", () => {
    it("computes standard short rental on time", () => {
      // Chakki Ramesh ko 3 din ke liye di, 200 roz (start: Nov 2, expected: Nov 5)
      const res = calculateEquipmentRental({
        startDate: "2026-11-02",
        expectedEndDate: "2026-11-05",
        actualReturnDate: "2026-11-05",
        dailyRate: 200,
      });

      expect(res.plannedDays).toBe(3);
      expect(res.totalDays).toBe(3);
      expect(res.lateDays).toBe(0);
      expect(res.totalAmount).toBe(600); // 3 * 200
      expect(res.isOverdue).toBe(false);
      expect(res.daysOverdue).toBe(0);
    });

    it("computes same-day return as 1 day minimum", () => {
      const res = calculateEquipmentRental({
        startDate: "2026-11-02",
        expectedEndDate: "2026-11-02",
        actualReturnDate: "2026-11-02",
        dailyRate: 250,
      });

      expect(res.plannedDays).toBe(1);
      expect(res.totalDays).toBe(1);
      expect(res.lateDays).toBe(0);
      expect(res.totalAmount).toBe(250);
    });

    it("computes late return with extra days and charge", () => {
      // 3 days planned, returned 2 days late (5 days total)
      const res = calculateEquipmentRental({
        startDate: "2026-11-01",
        expectedEndDate: "2026-11-04", // 3 days
        actualReturnDate: "2026-11-06", // returned on 6th -> 5 days
        dailyRate: 200,
      });

      expect(res.plannedDays).toBe(3);
      expect(res.totalDays).toBe(5);
      expect(res.lateDays).toBe(2);
      expect(res.totalAmount).toBe(1000); // 5 * 200
      expect(res.isOverdue).toBe(false); // returned, so not active overdue
    });

    it("identifies active rental overdue when today is past expected return date", () => {
      // Rented on Nov 1 for 2 days (due Nov 3). As of Nov 6, not returned yet.
      const res = calculateEquipmentRental({
        startDate: "2026-11-01",
        expectedEndDate: "2026-11-03",
        actualReturnDate: null,
        dailyRate: 300,
        asOfDate: "2026-11-06",
      });

      expect(res.isOverdue).toBe(true);
      expect(res.daysOverdue).toBe(3);
      expect(res.totalDays).toBe(5);
      expect(res.totalAmount).toBe(1500); // 5 days elapsed so far
    });
  });

  describe("generateRentSchedule", () => {
    it("generates monthly property rent schedule with due day", () => {
      // Room rented from Sept 2026 to Nov 2026 with due on 5th
      const schedules = generateRentSchedule({
        startDate: "2026-09-01",
        monthlyRate: 5000,
        dueDay: 5,
        asOfDate: "2026-11-09",
      });

      expect(schedules).toHaveLength(3);
      expect(schedules[0]).toEqual({
        periodKey: "2026-09",
        periodLabel: "September 2026",
        dueDate: "2026-09-05",
        amount: 5000,
      });
      expect(schedules[1]).toEqual({
        periodKey: "2026-10",
        periodLabel: "October 2026",
        dueDate: "2026-10-05",
        amount: 5000,
      });
      expect(schedules[2]).toEqual({
        periodKey: "2026-11",
        periodLabel: "November 2026",
        dueDate: "2026-11-05",
        amount: 5000,
      });
    });

    it("clamps due day to end of month for shorter months", () => {
      // Due day 31 in February 2026
      const schedules = generateRentSchedule({
        startDate: "2026-02-01",
        monthlyRate: 4000,
        dueDay: 31,
        asOfDate: "2026-02-15",
      });

      expect(schedules).toHaveLength(1);
      expect(schedules[0].dueDate).toBe("2026-02-28");
    });
  });

  describe("computeAgreementFinancials", () => {
    it("keeps security deposit strictly isolated from rent income", () => {
      const financials = computeAgreementFinancials({
        rate: 5000,
        ratePeriod: "per_month",
        startDate: "2026-11-01",
        dueDay: 5,
        depositTaken: 10000,
        depositReturned: 2000,
        depositDeductions: 1000,
        payments: [{ amount: 5000, paymentDate: "2026-11-05" }],
        asOfDate: "2026-11-09",
      });

      // Total collected only includes rent payments, NOT deposit
      expect(financials.totalCollected).toBe(5000);
      expect(financials.totalExpected).toBe(5000);
      expect(financials.totalPending).toBe(0);
      // Deposit held is 10000 - 2000 - 1000 = 7000
      expect(financials.depositHeld).toBe(7000);
    });

    it("computes overdue status and days overdue when rent is unpaid past due date", () => {
      // Rent due on Nov 5 (rate 5000), as of Nov 9 no payment made
      const financials = computeAgreementFinancials({
        rate: 5000,
        ratePeriod: "per_month",
        startDate: "2026-11-01",
        dueDay: 5,
        depositTaken: 5000,
        depositReturned: 0,
        depositDeductions: 0,
        payments: [],
        asOfDate: "2026-11-09",
      });

      expect(financials.totalExpected).toBe(5000);
      expect(financials.totalCollected).toBe(0);
      expect(financials.totalPending).toBe(5000);
      expect(financials.isOverdue).toBe(true);
      expect(financials.daysOverdue).toBe(4); // Nov 5 to Nov 9 = 4 days
    });

    it("handles partial payments correctly", () => {
      // 5000 due, 3000 paid partial
      const financials = computeAgreementFinancials({
        rate: 5000,
        ratePeriod: "per_month",
        startDate: "2026-11-01",
        dueDay: 5,
        depositTaken: 0,
        depositReturned: 0,
        depositDeductions: 0,
        payments: [{ amount: 3000, paymentDate: "2026-11-04" }],
        asOfDate: "2026-11-09",
      });

      expect(financials.totalExpected).toBe(5000);
      expect(financials.totalCollected).toBe(3000);
      expect(financials.totalPending).toBe(2000);
      expect(financials.isOverdue).toBe(true); // partially unpaid past due date
      expect(financials.daysOverdue).toBe(4);
    });
  });

  describe("computeRentalsOverview", () => {
    it("aggregates shop-wide rental totals correctly", () => {
      const a1 = computeAgreementFinancials({
        rate: 5000,
        ratePeriod: "per_month",
        startDate: "2026-11-01",
        dueDay: 5,
        depositTaken: 10000,
        depositReturned: 0,
        depositDeductions: 0,
        payments: [{ amount: 5000, paymentDate: "2026-11-04" }],
        asOfDate: "2026-11-09",
      });

      const a2 = computeAgreementFinancials({
        rate: 200,
        ratePeriod: "per_day",
        startDate: "2026-11-02",
        expectedEndDate: "2026-11-05",
        actualReturnDate: null,
        depositTaken: 500,
        depositReturned: 0,
        depositDeductions: 0,
        payments: [],
        asOfDate: "2026-11-09",
      });

      const overview = computeRentalsOverview([a1, a2]);

      expect(overview.thisMonthExpected).toBe(5000 + 1400); // 5000 property + 7 days * 200 = 1400
      expect(overview.thisMonthCollected).toBe(5000);
      expect(overview.thisMonthPending).toBe(1400);
      expect(overview.overdueCount).toBe(1); // a2 is overdue
      expect(overview.depositsHeld).toBe(10500); // 10000 + 500
    });
  });
});
