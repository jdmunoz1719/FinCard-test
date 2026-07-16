import { Transaction } from "../../../domain/entities/Transaction";
import {
  ITransactionRepository,
  SaveBatchMeta,
} from "../../../domain/repositories/ITransactionRepository";
import { PartnerId } from "../../../domain/value-objects/PartnerId";
import { TransactionDate } from "../../../domain/value-objects/TransactionDate";
import { Result } from "../../../shared/types/Result";
import {
  appendJsonLines,
  readJsonLines,
} from "../../../shared/utils/fileUtils";
import { toDomainTransaction, TransactionModel } from "./TransactionModel";

/**
 * Persiste y consulta transacciones validas (las que entran a liquidacion),
 * emulando una tabla con JSON Lines append-only. En produccion el mismo port
 * lo implementaria un repositorio sobre Redshift/Postgres.
 */
export class FileTransactionRepository implements ITransactionRepository {
  constructor(private readonly filePath: string) {}

  public async saveBatch(
    transactions: Transaction[],
    meta: SaveBatchMeta,
  ): Promise<Result<void, Error>> {
    try {
      const records: TransactionModel[] = transactions.map((t) => ({
        ...t.toPersistence(),
        batchId: meta.batchId,
        processedAt: meta.processedAt.toISOString(),
      }));
      await appendJsonLines(this.filePath, records);
      return Result.ok();
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async findByPartnerAndDateRange(
    partnerId: PartnerId,
    from: TransactionDate,
    to: TransactionDate,
  ): Promise<Result<Transaction[], Error>> {
    try {
      const records = await readJsonLines<TransactionModel>(this.filePath);
      const transactions = records
        .filter((r) => r.partnerId === partnerId.value)
        // Comparacion lexicografica valida: ISO YYYY-MM-DD ordena igual que la fecha.
        .filter(
          (r) =>
            r.transactionDate >= from.toString() &&
            r.transactionDate <= to.toString(),
        )
        .map(toDomainTransaction);
      return Result.ok(transactions);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
