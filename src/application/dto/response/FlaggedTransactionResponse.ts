/** DTO wire (snake_case) de una transaccion "sujeta a revision" para GET /transactions/flagged. */

export interface FlagReasonDto {
  /** Codigo estable (ej. DAILY_POINTS_EXCEEDED) para filtrar por maquina. */
  code: string;
  /** Regla de origen: RN-01..RN-04. */
  rule: string;
  /** Explicacion legible para el revisor humano. */
  message: string;
}

export interface FlaggedTransactionResponse {
  transaction_id: string;
  member_id: string;
  partner_id: string;
  partner_name: string;
  points_earned: number;
  points_redeemed: number;
  transaction_date: string;
  flag_reasons: FlagReasonDto[];
  batch_id: string;
  processed_at: string;
}
