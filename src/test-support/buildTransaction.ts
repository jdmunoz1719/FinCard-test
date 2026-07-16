import { Transaction } from "../domain/entities/Transaction";
import { MemberId } from "../domain/value-objects/MemberId";
import { PartnerId } from "../domain/value-objects/PartnerId";
import { PointAmount } from "../domain/value-objects/PointAmount";
import { TransactionDate } from "../domain/value-objects/TransactionDate";
import { TransactionId } from "../domain/value-objects/TransactionId";

export interface BuildTransactionOptions {
  id?: string;
  member?: string;
  partner?: string;
  earned?: number;
  redeemed?: number;
  date?: string;
  partnerName?: string;
}

/** Construye una Transaction valida; cada campo es sobreescribible. */
export function buildTransaction(
  opts: BuildTransactionOptions = {},
): Transaction {
  return Transaction.create({
    transactionId: TransactionId.create(opts.id ?? "TXN001"),
    memberId: MemberId.create(opts.member ?? "MEM001"),
    partnerId: PartnerId.create(opts.partner ?? "PART01"),
    pointsEarned: PointAmount.create(
      String(opts.earned ?? 100),
      "points_earned",
    ),
    pointsRedeemed: PointAmount.create(
      String(opts.redeemed ?? 0),
      "points_redeemed",
    ),
    transactionDate: TransactionDate.create(opts.date ?? "2026-07-01"),
    partnerName: opts.partnerName ?? "Cafe Central",
  });
}
