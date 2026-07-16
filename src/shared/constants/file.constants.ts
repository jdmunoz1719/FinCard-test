/**
 * @file file.constants.ts
 * @description Constantes del procesamiento de archivos CSV de transacciones:
 *              columnas obligatorias del contrato RF-01 y nombre del "bucket"
 *              (real en S3, emulado como carpeta raiz en desarrollo local).
 * @layer shared
 * @dependencies ninguna
 */

/** Columnas que el CSV debe traer (RF-01). El orden no importa; columnas extra se ignoran. */
export const REQUIRED_CSV_COLUMNS = [
  "transaction_id",
  "member_id",
  "partner_id",
  "points_earned",
  "points_redeemed",
  "transaction_date",
  "partner_name",
] as const;

export type RequiredCsvColumn = (typeof REQUIRED_CSV_COLUMNS)[number];

/** Nombre del bucket de transacciones (RF-02): s3://fincard-transactions/... */
export const TRANSACTIONS_BUCKET = "fincard-transactions";
