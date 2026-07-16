import { PartnerRecord } from "../repositories/IPartnerRepository";

export interface GetSettlementInput {
  partnerId: string;
  from: string;
  to: string;
}

/** Totales de un dia del rango (siempre presente, con ceros si no hubo actividad). */
export interface DailySettlementEntry {
  date: string;
  transactions: number;
  pointsEarned: number;
  pointsRedeemed: number;
}

export interface SettlementSummary {
  partner: PartnerRecord;
  period: { from: string; to: string };
  totalTransactions: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  /** Neto REAL, puede ser negativo. El wire lo expone como max(0, esto). */
  rawNetPoints: number;
  uniqueMembers: number;
  dailyBreakdown: DailySettlementEntry[];
}

export type GetSettlementOutput =
  | { outcome: "invalid_input"; message: string }
  | { outcome: "partner_not_found" }
  | { outcome: "ok"; settlement: SettlementSummary };

/** Consulta de liquidacion por aliado y rango de fechas (RF-04). */
export interface IGetSettlementUseCase {
  execute(input: GetSettlementInput): Promise<GetSettlementOutput>;
}
