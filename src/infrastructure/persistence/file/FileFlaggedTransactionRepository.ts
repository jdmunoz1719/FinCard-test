import { FlaggedTransaction } from "../../../domain/entities/FlaggedTransaction";
import {
  FlaggedTransactionFilter,
  IFlaggedTransactionRepository,
  PersistedFlaggedTransaction,
} from "../../../domain/repositories/IFlaggedTransactionRepository";
import { SaveBatchMeta } from "../../../domain/repositories/ITransactionRepository";
import {
  FlagReason,
  FlagReasonCode,
} from "../../../domain/value-objects/FlagReason";
import { Result } from "../../../shared/types/Result";
import {
  appendJsonLines,
  readJsonLines,
} from "../../../shared/utils/fileUtils";
import { toDomainTransaction, TransactionModel } from "./TransactionModel";

/** Registro plano de una flaggeada: transaccion + motivos + metadatos de batch. */
interface FlaggedTransactionModel extends TransactionModel {
  flagReasons: { code: FlagReasonCode; rule: string; message: string }[];
}

/**
 * Persiste y lista transacciones "sujetas a revision" con sus motivos tipados
 * (RF-05), en un JSONL fisicamente separado del de transacciones validas para
 * que una flaggeada no pueda colarse en la liquidacion.
 */
export class FileFlaggedTransactionRepository implements IFlaggedTransactionRepository {
  constructor(private readonly filePath: string) {}

  public async saveBatch(
    flagged: FlaggedTransaction[],
    meta: SaveBatchMeta,
  ): Promise<Result<void, Error>> {
    try {
      const records: FlaggedTransactionModel[] = flagged.map((f) => ({
        ...f.toPersistence(),
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

  public async findAll(
    filter?: FlaggedTransactionFilter,
  ): Promise<Result<PersistedFlaggedTransaction[], Error>> {
    try {
      const records = await readJsonLines<FlaggedTransactionModel>(
        this.filePath,
      );
      const filtered = filter?.partnerId
        ? records.filter((r) => r.partnerId === filter.partnerId)
        : records;

      const result: PersistedFlaggedTransaction[] = filtered.map((r) => ({
        flagged: FlaggedTransaction.create(
          toDomainTransaction(r),
          r.flagReasons.map((reason) =>
            FlagReason.fromPersistence(
              reason.code,
              reason.rule,
              reason.message,
            ),
          ),
        ),
        batchId: r.batchId,
        processedAt: r.processedAt,
      }));
      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
