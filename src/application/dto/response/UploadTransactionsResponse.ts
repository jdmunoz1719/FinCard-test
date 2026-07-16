/** DTO wire (snake_case) de la respuesta 200 del upload: procesamiento PARCIAL (validas procesadas, rechazadas reportadas). */

/** Error de una fila rechazada: fila (1 = primera de datos), columna y mensaje. */
export interface RowErrorDto {
  row: number;
  column: string;
  message: string;
}

/** Manifest RF-02 en formato wire. */
export interface ProcessingManifestDto {
  total_valid_rows: number;
  total_rejected_rows: number;
  errors: RowErrorDto[];
  processed_at: string;
  original_file_sha256: string;
}

export interface UploadTransactionsResponse {
  batch_id: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  errors: RowErrorDto[];
  manifest: ProcessingManifestDto;
  /** Ruta donde quedo archivado el CSV original del batch (S3 o local). */
  storage_path: string;
  /** Filas validas que RN-01..04 dejo "sujetas a revision" (no liquidan). */
  flagged_count: number;
}
