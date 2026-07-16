import { Result } from "../../shared/types/Result";
import { ProcessingManifest } from "../entities/ProcessingManifest";
import { Transaction } from "../entities/Transaction";

export interface StoreBatchInput {
  batchId: string;
  processedAt: Date;
  originalFileName: string;
  originalFileContent: string;
  /** Transacciones validas agrupadas por partner_id (particionado RF-02). */
  transactionsByPartner: Map<string, Transaction[]>;
  manifest: ProcessingManifest;
}

export interface StoreBatchResult {
  originalFilePath: string;
  /** Un archivo por aliado: {year}/{month}/{partner_id}/{batchId}.json */
  partnerFilePaths: string[];
  manifestPath: string;
}

/**
 * Puerto de almacenamiento de objetos (RF-02), abstrae Amazon S3. En
 * desarrollo lo implementa LocalFileStorageRepository con la misma
 * estructura de rutas que tendria el bucket real; en produccion seria un
 * adapter con @aws-sdk/client-s3, sin tocar dominio ni casos de uso.
 */
export interface IFileStorageRepository {
  storeBatch(input: StoreBatchInput): Promise<Result<StoreBatchResult, Error>>;
}
