import {
  ProcessingManifest,
  RowValidationError,
} from "../entities/ProcessingManifest";

export interface UploadTransactionsInput {
  fileContent: string;
  fileName: string;
}

/**
 * "invalid_file": error ESTRUCTURAL (archivo vacio, faltan columnas) — se
 * rechaza todo, 400. "processed": modelo PARCIAL, 200 — filas con error se
 * reportan en rowErrors, las validas siguen su curso normal.
 */
export type UploadTransactionsOutput =
  | { outcome: "invalid_file"; message: string }
  | {
      outcome: "processed";
      batchId: string;
      totalRows: number;
      validRows: number;
      rejectedRows: number;
      rowErrors: RowValidationError[];
      flaggedCount: number;
      manifest: ProcessingManifest;
      storagePath: string;
    };

/** Carga de transacciones (RF-01, RF-02, RF-03, RF-05). */
export interface IUploadTransactionsUseCase {
  execute(input: UploadTransactionsInput): Promise<UploadTransactionsOutput>;
}
