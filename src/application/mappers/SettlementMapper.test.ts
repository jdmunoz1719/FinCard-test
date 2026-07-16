/** Tests del mapper de liquidacion (RF-04): la regla "net_points_owed nunca negativo" vive aca. */

import { describe, expect, it } from "vitest";
import { SettlementSummary } from "../../domain/use-cases/IGetSettlementUseCase";
import { SettlementMapper } from "./SettlementMapper";

const mapper = new SettlementMapper();

function buildSummary(
  overrides: Partial<SettlementSummary> = {},
): SettlementSummary {
  return {
    partner: { partnerId: "PART01", partnerName: "Cafe Central" },
    period: { from: "2026-07-01", to: "2026-07-02" },
    totalTransactions: 2,
    totalPointsEarned: 150,
    totalPointsRedeemed: 20,
    rawNetPoints: 130,
    uniqueMembers: 2,
    dailyBreakdown: [
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
      },
    ],
    ...overrides,
  };
}

describe("SettlementMapper", () => {
  it("expone el neto tal cual cuando es positivo", () => {
    const response = mapper.toResponse(buildSummary({ rawNetPoints: 130 }));
    expect(response.summary.net_points_owed).toBe(130);
  });

  it("RF-04: nunca reporta un neto negativo, aunque el aliado deba puntos", () => {
    const response = mapper.toResponse(buildSummary({ rawNetPoints: -90 }));
    expect(response.summary.net_points_owed).toBe(0);
  });

  it("traduce el resto de campos a snake_case sin perder datos", () => {
    const response = mapper.toResponse(buildSummary());
    expect(response).toMatchObject({
      partner_id: "PART01",
      partner_name: "Cafe Central",
      period: { from: "2026-07-01", to: "2026-07-02" },
      summary: {
        total_transactions: 2,
        total_points_earned: 150,
        total_points_redeemed: 20,
        unique_members: 2,
      },
    });
    expect(response.daily_breakdown).toEqual([
      {
        date: "2026-07-01",
        transactions: 2,
        points_earned: 150,
        points_redeemed: 20,
      },
      {
        date: "2026-07-02",
        transactions: 0,
        points_earned: 0,
        points_redeemed: 0,
      },
    ]);
  });
});
