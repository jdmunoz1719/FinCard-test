/**
 * @file fakes.ts
 * @description Fakes en memoria de TODOS los ports del dominio, compartidos
 *              por los tests de use cases y de la capa web. Cada fake cumple
 *              el mismo contrato (Result) que el adapter real — los tests de
 *              use case ejercitan exactamente el codigo de produccion.
 * @layer test-support (excluido del build de produccion)
 * @dependencies ports del dominio, Result
 */

import { FlaggedTransaction } from "../domain/entities/FlaggedTransaction";
import { Transaction } from "../domain/entities/Transaction";
import {
  CatalogBatchRegistration,
  IDataCatalogRepository,
} from "../domain/repositories/IDataCatalogRepository";
import {
  IFileStorageRepository,
  StoreBatchInput,
  StoreBatchResult,
} from "../domain/repositories/IFileStorageRepository";
import {
  FlaggedTransactionFilter,
  IFlaggedTransactionRepository,
  PersistedFlaggedTransaction,
} from "../domain/repositories/IFlaggedTransactionRepository";
import {
  IPartnerRepository,
  PartnerRecord,
} from "../domain/repositories/IPartnerRepository";
import {
  ITransactionRepository,
  SaveBatchMeta,
} from "../domain/repositories/ITransactionRepository";
import { IDateProvider } from "../domain/services/IDateProvider";
import { IIdGenerator } from "../domain/services/IIdGenerator";
import { PartnerId } from "../domain/value-objects/PartnerId";
import { TransactionDate } from "../domain/value-objects/TransactionDate";
import { Result } from "../shared/types/Result";

/** Repositorio de transacciones validas en memoria (con seed opcional). */
export class InMemoryTransactionRepository implements ITransactionRepository {
  saved: Transaction[];

  constructor(seed: Transaction[] = []) {
    this.saved = [...seed];
  }

  async saveBatch(
    transactions: Transaction[],
    _meta: SaveBatchMeta,
  ): Promise<Result<void, Error>> {
    this.saved.push(...transactions);
    return Result.ok();
  }

  async findByPartnerAndDateRange(
    partnerId: PartnerId,
    from: TransactionDate,
    to: TransactionDate,
  ): Promise<Result<Transaction[], Error>> {
    return Result.ok(
      this.saved.filter(
        (t) =>
          t.partnerId.equals(partnerId) &&
          t.transactionDate.toString() >= from.toString() &&
          t.transactionDate.toString() <= to.toString(),
      ),
    );
  }
}

/** Repositorio de flaggeadas en memoria. */
export class InMemoryFlaggedRepository implements IFlaggedTransactionRepository {
  saved: {
    flagged: FlaggedTransaction;
    batchId: string;
    processedAt: string;
  }[] = [];

  async saveBatch(
    flagged: FlaggedTransaction[],
    meta: SaveBatchMeta,
  ): Promise<Result<void, Error>> {
    for (const f of flagged) {
      this.saved.push({
        flagged: f,
        batchId: meta.batchId,
        processedAt: meta.processedAt.toISOString(),
      });
    }
    return Result.ok();
  }

  async findAll(
    filter?: FlaggedTransactionFilter,
  ): Promise<Result<PersistedFlaggedTransaction[], Error>> {
    const records = filter?.partnerId
      ? this.saved.filter(
          (r) => r.flagged.transaction.partnerId.value === filter.partnerId,
        )
      : this.saved;
    return Result.ok(records);
  }
}

/** Storage en memoria: registra las llamadas y devuelve rutas mem://. */
export class InMemoryStoragePort implements IFileStorageRepository {
  calls: StoreBatchInput[] = [];

  async storeBatch(
    input: StoreBatchInput,
  ): Promise<Result<StoreBatchResult, Error>> {
    this.calls.push(input);
    return Result.ok({
      originalFilePath: `mem://raw/${input.batchId}.csv`,
      partnerFilePaths: Array.from(input.transactionsByPartner.keys()).map(
        (k) => `mem://${k}`,
      ),
      manifestPath: "mem://manifest",
    });
  }
}

/** Catalogo en memoria: registra llamadas para asserts. */
export class InMemoryCatalogPort implements IDataCatalogRepository {
  ensureDatabaseCalls: string[] = [];
  registerBatchCalls: CatalogBatchRegistration[] = [];

  async ensureDatabase(name: string): Promise<Result<void, Error>> {
    this.ensureDatabaseCalls.push(name);
    return Result.ok();
  }

  async ensureTransactionsTable(): Promise<Result<void, Error>> {
    return Result.ok();
  }

  async registerBatch(
    registration: CatalogBatchRegistration,
  ): Promise<Result<void, Error>> {
    this.registerBatchCalls.push(registration);
    return Result.ok();
  }
}

/** Repositorio de aliados con datos fijos. */
export class FakePartnerRepository implements IPartnerRepository {
  constructor(private readonly partners: PartnerRecord[]) {}

  async findById(
    partnerId: string,
  ): Promise<Result<PartnerRecord | null, Error>> {
    return Result.ok(
      this.partners.find((p) => p.partnerId === partnerId) ?? null,
    );
  }
}

/** Reloj congelado: RN-04 y processedAt deterministas en tests. */
export class FixedDateProvider implements IDateProvider {
  constructor(private readonly fixed: Date) {}

  now(): Date {
    return this.fixed;
  }
}

/** Generador de ids fijo: batch_id predecible en asserts. */
export class FixedIdGenerator implements IIdGenerator {
  constructor(private readonly id: string) {}

  generate(): string {
    return this.id;
  }
}
