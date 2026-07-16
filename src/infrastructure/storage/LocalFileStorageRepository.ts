import { join } from "node:path";
import {
  IFileStorageRepository,
  StoreBatchInput,
  StoreBatchResult,
} from "../../domain/repositories/IFileStorageRepository";
import { TRANSACTIONS_BUCKET } from "../../shared/constants/file.constants";
import { Result } from "../../shared/types/Result";
import { writeJson, writeRawFile } from "../../shared/utils/fileUtils";

/**
 * Adaptador de storage para desarrollo: emula S3 con el filesystem local
 * (RF-02), usando la misma estructura de rutas que tendria el bucket real:
 *
 *   {root}/fincard-transactions/{year}/{month}/{partner_id}/{batchId}.json  <- particiones
 *   {root}/fincard-transactions/{year}/{month}/raw/{batchId}.csv           <- original
 *   {root}/fincard-transactions/manifests/{batchId}.json                   <- manifest
 *
 * year/month salen de processedAt (fecha de ingesta, no de transaccion),
 * patron habitual de particionado por llegada en data lakes. En produccion
 * se sustituye por S3FileStorageRepository con el mismo port.
 */
export class LocalFileStorageRepository implements IFileStorageRepository {
  constructor(private readonly root: string) {}

  /** Falla como Result (no throw) si el filesystem falla; el use case decide que hacer. */
  public async storeBatch(
    input: StoreBatchInput,
  ): Promise<Result<StoreBatchResult, Error>> {
    try {
      const year = String(input.processedAt.getUTCFullYear());
      const month = String(input.processedAt.getUTCMonth() + 1).padStart(
        2,
        "0",
      );
      const base = join(this.root, TRANSACTIONS_BUCKET, year, month);

      // 1. Archivo original del batch (auditoria + verificacion de SHA-256).
      const originalFilePath = join(base, "raw", `${input.batchId}.csv`);
      await writeRawFile(originalFilePath, input.originalFileContent);

      // 2. Transacciones validas particionadas por aliado.
      const partnerFilePaths: string[] = [];
      for (const [partnerId, transactions] of input.transactionsByPartner) {
        const filePath = join(base, partnerId, `${input.batchId}.json`);
        const records = transactions.map((t) => ({
          ...t.toPersistence(),
          batchId: input.batchId,
          processedAt: input.processedAt.toISOString(),
        }));
        await writeJson(filePath, records);
        partnerFilePaths.push(filePath);
      }

      // 3. Manifest del procesamiento.
      const manifestPath = join(
        this.root,
        TRANSACTIONS_BUCKET,
        "manifests",
        `${input.batchId}.json`,
      );
      await writeJson(manifestPath, input.manifest.toJSON());

      return Result.ok({ originalFilePath, partnerFilePaths, manifestPath });
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
