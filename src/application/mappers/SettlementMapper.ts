import { SettlementSummary } from "../../domain/use-cases/IGetSettlementUseCase";
import { SettlementResponse } from "../dto/response/SettlementResponse";

/** Traduce SettlementSummary (dominio) al wire de RF-04: net_points_owed = max(0, rawNetPoints). */
export class SettlementMapper {
  public toResponse(summary: SettlementSummary): SettlementResponse {
    return {
      partner_id: summary.partner.partnerId,
      partner_name: summary.partner.partnerName,
      period: summary.period,
      summary: {
        total_transactions: summary.totalTransactions,
        total_points_earned: summary.totalPointsEarned,
        total_points_redeemed: summary.totalPointsRedeemed,
        net_points_owed: Math.max(0, summary.rawNetPoints),
        unique_members: summary.uniqueMembers,
      },
      daily_breakdown: summary.dailyBreakdown.map((d) => ({
        date: d.date,
        transactions: d.transactions,
        points_earned: d.pointsEarned,
        points_redeemed: d.pointsRedeemed,
      })),
    };
  }
}
