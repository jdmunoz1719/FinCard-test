import { Result } from "../../shared/types/Result";
import { Transaction } from "../entities/Transaction";
import { PartnerId } from "../value-objects/PartnerId";
import { TransactionDate } from "../value-objects/TransactionDate";

export interface SaveBatchMeta {
  batchId: string;
  processedAt: Date;
}

/**
 * Puerto de persistencia de transacciones validas. El dominio no sabe si
 * detras hay JSON Lines local, Postgres o Redshift — solo este contrato.
 */
export interface ITransactionRepository {
  saveBatch(
    transactions: Transaction[],
    meta: SaveBatchMeta,
  ): Promise<Result<void, Error>>;

  /** Transacciones de un aliado en un rango de fechas, ambos extremos inclusive. */
  findByPartnerAndDateRange(
    partnerId: PartnerId,
    from: TransactionDate,
    to: TransactionDate,
  ): Promise<Result<Transaction[], Error>>;
}
