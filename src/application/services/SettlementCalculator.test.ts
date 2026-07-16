/** Tests del calculo puro de liquidacion (RF-04): totales, miembros unicos, neto crudo, daily_breakdown sin huecos. */

import { describe, expect, it } from "vitest";
import { buildTransaction as tx } from "../../test-support/buildTransaction";
import { SettlementCalculator } from "./SettlementCalculator";

const PARTNER = { partnerId: "PART01", partnerName: "Cafe Central" };
const calculator = new SettlementCalculator();

describe("SettlementCalculator", () => {
  it("agrega totales y rellena con ceros los dias sin transacciones", () => {
    const summary = calculator.calculate(
      PARTNER,
      [
        tx({ id: "T1", member: "MEM001", earned: 100, date: "2026-07-01" }),
        tx({
          id: "T2",
          member: "MEM002",
          earned: 50,
          redeemed: 20,
          date: "2026-07-01",
        }),
        tx({ id: "T3", member: "MEM001", earned: 30, date: "2026-07-03" }),
      ],
      "2026-07-01",
      "2026-07-03",
    );

    expect(summary.totalTransactions).toBe(3);
    expect(summary.totalPointsEarned).toBe(180);
    expect(summary.totalPointsRedeemed).toBe(20);
    expect(summary.rawNetPoints).toBe(160);
    expect(summary.uniqueMembers).toBe(2);

    expect(summary.dailyBreakdown).toEqual([
      {
        date: "2026-07-01",
        transactions: 2,
        pointsEarned: 150,
        pointsRedeemed: 20,
      },
      {
        date: "2026-07-02",
        transactions: 0,
        pointsEarned: 0,
        pointsRedeemed: 0,
      }, // dia sin actividad
      {
        date: "2026-07-03",
        transactions: 1,
        pointsEarned: 30,
        pointsRedeemed: 0,
      },
    ]);
  });

  it("conserva el neto CRUDO negativo (el clamp a 0 es del mapper, no del calculo)", () => {
    const summary = calculator.calculate(
      PARTNER,
      [tx({ id: "T1", earned: 10, redeemed: 100, date: "2026-07-01" })],
      "2026-07-01",
      "2026-07-01",
    );
    expect(summary.rawNetPoints).toBe(-90);
  });

  it("con cero transacciones produce todos los dias en cero", () => {
    const summary = calculator.calculate(
      PARTNER,
      [],
      "2026-07-01",
      "2026-07-02",
    );
    expect(summary.totalTransactions).toBe(0);
    expect(summary.dailyBreakdown).toHaveLength(2);
    expect(summary.dailyBreakdown.every((d) => d.transactions === 0)).toBe(
      true,
    );
  });
});
