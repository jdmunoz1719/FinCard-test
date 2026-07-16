// Modelo de persistencia (shape plano JSON) de una transaccion y su
// reconstruccion a entidad de dominio: la frontera donde los value objects
// se aplanan y se rehidratan.

import { Transaction } from "../../../domain/entities/Transaction";
import { MemberId } from "../../../domain/value-objects/MemberId";
import { PartnerId } from "../../../domain/value-objects/PartnerId";
import { PointAmount } from "../../../domain/value-objects/PointAmount";
import { TransactionDate } from "../../../domain/value-objects/TransactionDate";
import { TransactionId } from "../../../domain/value-objects/TransactionId";

/** Registro plano tal como se persiste en JSON Lines. */
export interface TransactionModel {
  transactionId: string;
  memberId: string;
  partnerId: string;
  pointsEarned: number;
  pointsRedeemed: number;
  transactionDate: string;
  partnerName: string;
  batchId: string;
  processedAt: string;
}

/**
 * Reconstruye la entidad desde un registro persistido. Los datos ya fueron
 * validados al entrar al sistema, por lo que los create() no deberian lanzar;
 * si lanzan, el archivo fue manipulado externamente y ES correcto fallar.
 */
export function toDomainTransaction(model: TransactionModel): Transaction {
  return Transaction.create({
    transactionId: TransactionId.create(model.transactionId),
    memberId: MemberId.create(model.memberId),
    partnerId: PartnerId.create(model.partnerId),
    pointsEarned: PointAmount.create(
      String(model.pointsEarned),
      "points_earned",
    ),
    pointsRedeemed: PointAmount.create(
      String(model.pointsRedeemed),
      "points_redeemed",
    ),
    transactionDate: TransactionDate.create(model.transactionDate),
    partnerName: model.partnerName,
  });
}
