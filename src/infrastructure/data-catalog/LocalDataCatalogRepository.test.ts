/** Tests del catalogo Glue emulado: idempotencia de ensure* y acumulacion de batches registrados. */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GLUE_DATABASE_NAME,
  GLUE_TABLE_NAME,
} from "../../shared/constants/settlement.constants";
import { readJson } from "../../shared/utils/fileUtils";
import { LocalDataCatalogRepository } from "./LocalDataCatalogRepository";

describe("LocalDataCatalogRepository", () => {
  let dir: string;
  let catalogPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fincard-glue-"));
    catalogPath = join(dir, "glue-catalog.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("crea base de datos y tabla de forma idempotente (schema RF-03 con 9 columnas)", async () => {
    const repo = new LocalDataCatalogRepository(catalogPath);
    expect((await repo.ensureDatabase(GLUE_DATABASE_NAME)).isOk).toBe(true);
    expect((await repo.ensureTransactionsTable()).isOk).toBe(true);
    expect((await repo.ensureTransactionsTable()).isOk).toBe(true); // repetido: sin duplicar

    const state = await readJson<any>(catalogPath, {});
    expect(Object.keys(state.databases[GLUE_DATABASE_NAME].tables)).toEqual([
      GLUE_TABLE_NAME,
    ]);
    expect(
      state.databases[GLUE_DATABASE_NAME].tables[GLUE_TABLE_NAME].columns,
    ).toHaveLength(9);
  });

  it("registra batches acumulativamente (equivalente local de particiones)", async () => {
    const repo = new LocalDataCatalogRepository(catalogPath);
    await repo.ensureTransactionsTable();
    await repo.registerBatch({
      batchId: "b1",
      partnerId: "PART01",
      rowCount: 5,
      location: "/path/1",
      processedAt: new Date("2026-07-01T00:00:00Z"),
    });
    await repo.registerBatch({
      batchId: "b2",
      partnerId: "PART02",
      rowCount: 3,
      location: "/path/2",
      processedAt: new Date("2026-07-02T00:00:00Z"),
    });

    const state = await readJson<any>(catalogPath, {});
    expect(
      state.databases[GLUE_DATABASE_NAME].tables[GLUE_TABLE_NAME].batches,
    ).toHaveLength(2);
  });
});
