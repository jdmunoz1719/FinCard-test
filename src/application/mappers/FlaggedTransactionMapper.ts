import { PersistedFlaggedTransaction } from "../../domain/repositories/IFlaggedTransactionRepository";
import { FlaggedTransactionResponse } from "../dto/response/FlaggedTransactionResponse";

/** Traduce FlaggedTransaction (dominio) al DTO wire de GET /transactions/flagged. */
export class FlaggedTransactionMapper {
  public toResponse(
    record: PersistedFlaggedTransaction,
  ): FlaggedTransactionResponse {
    const t = record.flagged.transaction;
    return {
      transaction_id: t.transactionId.value,
      member_id: t.memberId.value,
      partner_id: t.partnerId.value,
      partner_name: t.partnerName,
      points_earned: t.pointsEarned.value,
      points_redeemed: t.pointsRedeemed.value,
      transaction_date: t.transactionDate.toString(),
      flag_reasons: record.flagged.reasons.map((r) => ({
        code: r.code,
        rule: r.rule,
        message: r.message,
      })),
      batch_id: record.batchId,
      processed_at: record.processedAt,
    };
  }
}
