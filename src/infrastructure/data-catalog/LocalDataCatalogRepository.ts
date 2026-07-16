import {
  CatalogBatchRegistration,
  IDataCatalogRepository,
} from "../../domain/repositories/IDataCatalogRepository";
import {
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
} from "../../shared/constants/settlement.constants";
import { Result } from "../../shared/types/Result";
import { readJson, writeJson } from "../../shared/utils/fileUtils";

/** Schema RF-03 de la tabla fincard_loyalty.transactions. */
const TRANSACTIONS_TABLE_SCHEMA = [
  { name: "transaction_id", type: "STRING" },
  { name: "member_id", type: "STRING" },
  { name: "partner_id", type: "STRING" },
  { name: "points_earned", type: "INT" },
  { name: "points_redeemed", type: "INT" },
  { name: "transaction_date", type: "DATE" },
  { name: "partner_name", type: "STRING" },
  { name: "processed_at", type: "TIMESTAMP" },
  { name: "batch_id", type: "STRING" },
] as const;

interface CatalogTable {
  columns: typeof TRANSACTIONS_TABLE_SCHEMA;
  batches: CatalogBatchRegistration[];
}

interface CatalogState {
  databases: Record<string, { tables: Record<string, CatalogTable> }>;
}

/**
 * Adaptador de catalogacion para desarrollo: emula AWS Glue Data Catalog
 * (RF-03) guardando en un JSON local la base fincard_loyalty, la tabla
 * transactions y un registro por batch. En produccion se sustituye por un
 * GlueDataCatalogRepository con el mismo port. Las operaciones ensure* son
 * idempotentes.
 */
export class LocalDataCatalogRepository implements IDataCatalogRepository {
  constructor(private readonly catalogPath: string) {}

  public async ensureDatabase(name: string): Promise<Result<void, Error>> {
    try {
      const state = await this.load();
      if (!state.databases[name]) {
        state.databases[name] = { tables: {} };
        await this.save(state);
      }
      return Result.ok();
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async ensureTransactionsTable(): Promise<Result<void, Error>> {
    try {
      const state = await this.load();
      const db = (state.databases[GLUE_DATABASE_NAME] ??= { tables: {} });
      if (!db.tables[GLUE_TABLE_NAME]) {
        db.tables[GLUE_TABLE_NAME] = {
          columns: TRANSACTIONS_TABLE_SCHEMA,
          batches: [],
        };
        await this.save(state);
      }
      return Result.ok();
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  public async registerBatch(
    registration: CatalogBatchRegistration,
  ): Promise<Result<void, Error>> {
    try {
      const state = await this.load();
      const db = (state.databases[GLUE_DATABASE_NAME] ??= { tables: {} });
      const table = (db.tables[GLUE_TABLE_NAME] ??= {
        columns: TRANSACTIONS_TABLE_SCHEMA,
        batches: [],
      });
      table.batches.push(registration);
      await this.save(state);
      return Result.ok();
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  private async load(): Promise<CatalogState> {
    return readJson<CatalogState>(this.catalogPath, { databases: {} });
  }

  private async save(state: CatalogState): Promise<void> {
    await writeJson(this.catalogPath, state);
  }
}
