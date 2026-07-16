import { Result } from "../../shared/types/Result";

/** Registro de catalogacion de un batch para un aliado. */
export interface CatalogBatchRegistration {
  batchId: string;
  partnerId: string;
  rowCount: number;
  /** Ubicacion fisica de los datos (ruta S3 o filesystem local). */
  location: string;
  processedAt: Date;
}

/**
 * Puerto de catalogacion (RF-03), abstrae AWS Glue Data Catalog.
 * En desarrollo lo implementa LocalDataCatalogRepository (JSON local);
 * en produccion seria un adapter con @aws-sdk/client-glue.
 */
export interface IDataCatalogRepository {
  /** Crea la base de datos si no existe (idempotente). */
  ensureDatabase(name: string): Promise<Result<void, Error>>;

  /** Crea la tabla transactions con su schema si no existe (idempotente). */
  ensureTransactionsTable(): Promise<Result<void, Error>>;

  /** Registra un batch procesado (equivale a agregar particion en Glue). */
  registerBatch(
    registration: CatalogBatchRegistration,
  ): Promise<Result<void, Error>>;
}
