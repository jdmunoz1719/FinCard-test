import { ProcessingManifest } from "../../domain/entities/ProcessingManifest";
import { Transaction } from "../../domain/entities/Transaction";
import { InvalidCsvFormatException } from "../../domain/exceptions/InvalidCsvFormatException";
import { IDataCatalogRepository } from "../../domain/repositories/IDataCatalogRepository";
import { IFileStorageRepository } from "../../domain/repositories/IFileStorageRepository";
import { IFlaggedTransactionRepository } from "../../domain/repositories/IFlaggedTransactionRepository";
import { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import { IBusinessRulesValidator } from "../../domain/services/IBusinessRulesValidator";
import { ICsvParser } from "../../domain/services/ICsvParser";
import { IDataQualityValidator } from "../../domain/services/IDataQualityValidator";
import { IDateProvider } from "../../domain/services/IDateProvider";
import { IHashGenerator } from "../../domain/services/IHashGenerator";
import { IIdGenerator } from "../../domain/services/IIdGenerator";
import {
  IUploadTransactionsUseCase,
  UploadTransactionsInput,
  UploadTransactionsOutput,
} from "../../domain/use-cases/IUploadTransactionsUseCase";
import { GLUE_DATABASE_NAME } from "../../shared/constants/settlement.constants";
import { Result } from "../../shared/types/Result";

/** Dependencias del caso de uso: SOLO interfaces (ports), nunca clases concretas. */
export interface UploadTransactionsDeps {
  csvParser: ICsvParser;
  dataQualityValidator: IDataQualityValidator;
  businessRulesValidator: IBusinessRulesValidator;
  transactionRepository: ITransactionRepository;
  flaggedTransactionRepository: IFlaggedTransactionRepository;
  fileStorage: IFileStorageRepository;
  dataCatalog: IDataCatalogRepository;
  hashGenerator: IHashGenerator;
  idGenerator: IIdGenerator;
  dateProvider: IDateProvider;
}

/**
 * Coordina la carga de un CSV (RF-01, RF-02, RF-03, RF-05): parsear, validar
 * por fila, aplicar RN-01..04, archivar, catalogar y persistir. No tiene
 * logica de negocio propia — cada paso vive en su propio servicio, aca solo
 * se define el orden y que hacer si algo falla.
 *
 * Solo lanza si falla algo de infraestructura (storage/persistencia) —
 * eso lo convierte en 500 mas arriba. Los casos de negocio (archivo
 * invalido, filas rechazadas) son parte del resultado, no excepciones.
 */
export class UploadTransactionsUseCase implements IUploadTransactionsUseCase {
  constructor(private readonly deps: UploadTransactionsDeps) {}

  public async execute(
    input: UploadTransactionsInput,
  ): Promise<UploadTransactionsOutput> {
    // --- 1. Parseo -------------------------------------------------------
    const parsed = this.deps.csvParser.parse(input.fileContent);
    if (parsed.header.length === 0)
      return { outcome: "invalid_file", message: "El archivo CSV esta vacio" };

    // --- 2. Calidad de datos por fila (RF-01) ----------------------------
    // InvalidCsvFormatException = problema estructural del header: el archivo
    // completo es invalido, no una fila puntual.
    let quality;
    try {
      quality = this.deps.dataQualityValidator.validate(parsed);
    } catch (error) {
      if (error instanceof InvalidCsvFormatException)
        return { outcome: "invalid_file", message: error.message };

      throw error;
    }

    // --- 3. Reglas de negocio cruzadas (RF-05) ---------------------------
    const { valid, flagged } = this.deps.businessRulesValidator.evaluate(
      quality.transactions,
    );

    // --- 4. Manifest (RF-02) ---------------------------------------------
    const processedAt = this.deps.dateProvider.now();
    const batchId = this.deps.idGenerator.generate();
    const manifest = ProcessingManifest.create({
      batchId,
      totalValidRows: quality.transactions.length,
      totalRejectedRows: this.countDistinctRows(
        quality.errors.map((e) => e.row),
      ),
      totalFlaggedRows: flagged.length,
      rowErrors: quality.errors,
      processedAt: processedAt.toISOString(),
      originalFileSha256: this.deps.hashGenerator.sha256(input.fileContent),
    });

    // --- 5. Storage (RF-02): original + particiones por aliado + manifest -
    const storeResult = this.unwrap(
      await this.deps.fileStorage.storeBatch({
        batchId,
        processedAt,
        originalFileName: input.fileName,
        originalFileContent: input.fileContent,
        transactionsByPartner: this.groupByPartner(valid),
        manifest,
      }),
      "No se pudo almacenar el batch en el storage",
    );

    // --- 6. Catalogacion (RF-03) ------------------------------------------
    this.unwrap(
      await this.deps.dataCatalog.ensureDatabase(GLUE_DATABASE_NAME),
      "No se pudo asegurar la base de datos del catalogo",
    );
    this.unwrap(
      await this.deps.dataCatalog.ensureTransactionsTable(),
      "No se pudo asegurar la tabla del catalogo",
    );
    const grouped = this.groupByPartner(valid);
    let pathIndex = 0;
    for (const [partnerId, partnerTransactions] of grouped) {
      this.unwrap(
        await this.deps.dataCatalog.registerBatch({
          batchId,
          partnerId,
          rowCount: partnerTransactions.length,
          location:
            storeResult.partnerFilePaths[pathIndex++] ??
            storeResult.originalFilePath,
          processedAt,
        }),
        "No se pudo registrar el batch en el catalogo",
      );
    }

    // --- 7. Persistencia --------------------------------------------------
    const meta = { batchId, processedAt };
    this.unwrap(
      await this.deps.transactionRepository.saveBatch(valid, meta),
      "No se pudieron persistir las transacciones validas",
    );
    this.unwrap(
      await this.deps.flaggedTransactionRepository.saveBatch(flagged, meta),
      "No se pudieron persistir las transacciones flaggeadas",
    );

    return {
      outcome: "processed",
      batchId,
      totalRows: parsed.rows.length,
      validRows: quality.transactions.length,
      rejectedRows: manifest.totalRejectedRows,
      rowErrors: quality.errors,
      flaggedCount: flagged.length,
      manifest,
      storagePath: storeResult.originalFilePath,
    };
  }

  /** Agrupa transacciones por partner_id (particionado RF-02). */
  private groupByPartner(
    transactions: Transaction[],
  ): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const group = groups.get(t.partnerId.value) ?? [];
      group.push(t);
      groups.set(t.partnerId.value, group);
    }
    return groups;
  }

  /** Filas distintas con error (una fila puede fallar varias columnas). */
  private countDistinctRows(rows: number[]): number {
    return new Set(rows).size;
  }

  /**
   * Desenvuelve un Result de infraestructura: si fallo, lanza con contexto.
   * Un fallo de storage/persistencia SI es excepcional (no es flujo de
   * control del negocio), por eso aqui se convierte en excepcion -> 500.
   */
  private unwrap<T>(result: Result<T, Error>, context: string): T {
    if (result.isFail) {
      throw new Error(`${context}: ${result.error.message}`);
    }
    return result.value;
  }
}
