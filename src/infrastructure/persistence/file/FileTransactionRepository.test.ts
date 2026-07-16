/** Tests del repositorio de archivo (directorios temporales reales): guardado en batch, consulta por aliado + rango. */

import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PartnerId } from "../../../domain/value-objects/PartnerId";
import { TransactionDate } from "../../../domain/value-objects/TransactionDate";
import { buildTransaction as tx } from "../../../test-support/buildTransaction";
import { FileTransactionRepository } from "./FileTransactionRepository";

describe("FileTransactionRepository", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fincard-test-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("guarda un batch y recupera filtrando por partner y rango de fechas", async () => {
    const repo = new FileTransactionRepository(join(dir, "transactions.jsonl"));
    const saveResult = await repo.saveBatch(
      [
        tx({ id: randomUUID(), partner: "PART01", date: "2026-07-01" }),
        tx({ id: randomUUID(), partner: "PART01", date: "2026-07-15" }), // fuera del rango
        tx({ id: randomUUID(), partner: "PART02", date: "2026-07-05" }), // otro aliado
      ],
      { batchId: "batch-1", processedAt: new Date("2026-07-16T00:00:00Z") },
    );
    expect(saveResult.isOk).toBe(true);

    const result = await repo.findByPartnerAndDateRange(
      PartnerId.create("PART01"),
      TransactionDate.create("2026-07-01"),
      TransactionDate.create("2026-07-10"),
    );

    expect(result.isOk).toBe(true);
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.transactionDate.toString()).toBe("2026-07-01");
  });

  it("devuelve ok con lista vacia si el archivo no existe todavia", async () => {
    const repo = new FileTransactionRepository(
      join(dir, "does-not-exist.jsonl"),
    );
    const result = await repo.findByPartnerAndDateRange(
      PartnerId.create("PART01"),
      TransactionDate.create("2026-01-01"),
      TransactionDate.create("2026-12-31"),
    );
    expect(result.isOk).toBe(true);
    expect(result.value).toEqual([]);
  });
});
