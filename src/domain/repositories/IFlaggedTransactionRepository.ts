import { Result } from "../../shared/types/Result";
import { FlaggedTransaction } from "../entities/FlaggedTransaction";
import { SaveBatchMeta } from "./ITransactionRepository";

export interface PersistedFlaggedTransaction {
  flagged: FlaggedTransaction;
  batchId: string;
  processedAt: string;
}

export interface FlaggedTransactionFilter {
  partnerId?: string;
}

/**
 * Puerto de la tabla transactions_flagged (RF-05). Separado a proposito de
 * ITransactionRepository: estas filas nunca deben poder aparecer en una
 * consulta de liquidacion, ni por error.
 */
export interface IFlaggedTransactionRepository {
  saveBatch(
    flagged: FlaggedTransaction[],
    meta: SaveBatchMeta,
  ): Promise<Result<void, Error>>;
  findAll(
    filter?: FlaggedTransactionFilter,
  ): Promise<Result<PersistedFlaggedTransaction[], Error>>;
}
