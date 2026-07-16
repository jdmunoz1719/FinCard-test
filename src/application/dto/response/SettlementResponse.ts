/** DTO wire (snake_case) de la respuesta de RF-04, con la forma exacta del enunciado. */

export interface DailyBreakdownDto {
  date: string;
  transactions: number;
  points_earned: number;
  points_redeemed: number;
}

export interface SettlementSummaryDto {
  total_transactions: number;
  total_points_earned: number;
  total_points_redeemed: number;
  /** max(0, earned - redeemed): el contrato RF-04 nunca reporta negativo. */
  net_points_owed: number;
  unique_members: number;
}

export interface SettlementResponse {
  partner_id: string;
  partner_name: string;
  period: { from: string; to: string };
  summary: SettlementSummaryDto;
  /** TODOS los dias del rango, incluso sin transacciones (con ceros). */
  daily_breakdown: DailyBreakdownDto[];
}
