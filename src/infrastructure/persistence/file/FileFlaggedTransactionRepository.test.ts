/** Tests de la tabla transactions_flagged en archivo: roundtrip guardar -> listar preservando motivos tipados. */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FlaggedTransaction } from "../../../domain/entities/FlaggedTransaction";
import { FlagReason } from "../../../domain/value-objects/FlagReason";
import { buildTransaction as tx } from "../../../test-support/buildTransaction";
import { FileFlaggedTransactionRepository } from "./FileFlaggedTransactionRepository";

describe("FileFlaggedTransactionRepository", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "fincard-flagged-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("roundtrip: guarda flaggeadas y las recupera con motivos y metadatos intactos", async () => {
    const repo = new FileFlaggedTransactionRepository(
      join(dir, "flagged.jsonl"),
    );
    await repo.saveBatch(
      [
        FlaggedTransaction.create(tx({ id: "T1", partner: "PART01" }), [
          FlagReason.dailyPointsExceeded(),
          FlagReason.dateOutOfRange("fecha futura"),
        ]),
      ],
      { batchId: "batch-9", processedAt: new Date("2026-07-14T00:00:00Z") },
    );

    const result = await repo.findAll();
    expect(result.isOk).toBe(true);
    const record = result.value[0]!;
    expect(record.batchId).toBe("batch-9");
    expect(record.flagged.transaction.transactionId.value).toBe("T1");
    expect(record.flagged.reasons.map((r) => r.code)).toEqual([
      "DAILY_POINTS_EXCEEDED",
      "DATE_OUT_OF_RANGE",
    ]);
  });

  it("findAll filtra por partnerId", async () => {
    const repo = new FileFlaggedTransactionRepository(
      join(dir, "flagged.jsonl"),
    );
    await repo.saveBatch(
      [
        FlaggedTransaction.create(tx({ id: "T1", partner: "PART01" }), [
          FlagReason.dailyPointsExceeded(),
        ]),
        FlaggedTransaction.create(tx({ id: "T2", partner: "PART02" }), [
          FlagReason.dailyPointsExceeded(),
        ]),
      ],
      { batchId: "b", processedAt: new Date() },
    );

    const result = await repo.findAll({ partnerId: "PART02" });
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.flagged.transaction.transactionId.value).toBe("T2");
  });

  it("findAll sobre archivo inexistente devuelve ok vacio", async () => {
    const repo = new FileFlaggedTransactionRepository(join(dir, "nope.jsonl"));
    const result = await repo.findAll();
    expect(result.isOk).toBe(true);
    expect(result.value).toEqual([]);
  });
});
