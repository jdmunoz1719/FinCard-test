/** Tests del flujo de carga con fakes en memoria: procesamiento parcial, flagged, manifest. */

import { beforeEach, describe, expect, it } from "vitest";
import { CsvParser } from "../../infrastructure/csv/CsvParser";
import { CryptoHashGenerator } from "../../infrastructure/hash/CryptoHashGenerator";
import { BusinessRulesValidator } from "../../infrastructure/validators/BusinessRulesValidator";
import { DataQualityValidator } from "../../infrastructure/validators/DataQualityValidator";
import { DailyPointsThresholdRule } from "../../infrastructure/validators/rules/DailyPointsThresholdRule";
import { DateRangeRule } from "../../infrastructure/validators/rules/DateRangeRule";
import { MemberDailyTransactionLimitRule } from "../../infrastructure/validators/rules/MemberDailyTransactionLimitRule";
import { RedemptionRatioRule } from "../../infrastructure/validators/rules/RedemptionRatioRule";
import {
  FixedDateProvider,
  FixedIdGenerator,
  InMemoryCatalogPort,
  InMemoryFlaggedRepository,
  InMemoryStoragePort,
  InMemoryTransactionRepository,
} from "../../test-support/fakes";
import { UploadTransactionsUseCase } from "./UploadTransactionsUseCase";

const HEADER =
  "transaction_id,member_id,partner_id,points_earned,points_redeemed,transaction_date,partner_name";
const NOW = new Date("2026-07-16T00:00:00Z");

function buildContext() {
  const dateProvider = new FixedDateProvider(NOW);
  const transactionRepository = new InMemoryTransactionRepository();
  const flaggedTransactionRepository = new InMemoryFlaggedRepository();
  const fileStorage = new InMemoryStoragePort();
  const dataCatalog = new InMemoryCatalogPort();

  const useCase = new UploadTransactionsUseCase({
    csvParser: new CsvParser(),
    dataQualityValidator: new DataQualityValidator(),
    businessRulesValidator: new BusinessRulesValidator([
      new DailyPointsThresholdRule(),
      new RedemptionRatioRule(),
      new MemberDailyTransactionLimitRule(),
      new DateRangeRule(dateProvider),
    ]),
    transactionRepository,
    flaggedTransactionRepository,
    fileStorage,
    dataCatalog,
    hashGenerator: new CryptoHashGenerator(),
    idGenerator: new FixedIdGenerator("batch-test-1"),
    dateProvider,
  });

  return {
    useCase,
    transactionRepository,
    flaggedTransactionRepository,
    fileStorage,
    dataCatalog,
  };
}

function execute(ctx: ReturnType<typeof buildContext>, csv: string) {
  return ctx.useCase.execute({
    fileContent: csv,
    fileName: "transactions.csv",
  });
}

describe("UploadTransactionsUseCase", () => {
  let ctx: ReturnType<typeof buildContext>;

  beforeEach(() => {
    ctx = buildContext();
  });

  it("procesa un archivo 100% valido: persiste, cataloga y archiva", async () => {
    const result = await execute(
      ctx,
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN002,MEM002,PART02,80,0,2026-07-01,Gasolinera Express`,
    );

    expect(result.outcome).toBe("processed");
    if (result.outcome !== "processed") throw new Error("unreachable");
    expect(result.batchId).toBe("batch-test-1");
    expect(result.totalRows).toBe(2);
    expect(result.validRows).toBe(2);
    expect(result.rejectedRows).toBe(0);
    expect(result.flaggedCount).toBe(0);
    expect(result.manifest.originalFileSha256).toHaveLength(64);
    expect(result.storagePath).toBe("mem://raw/batch-test-1.csv");

    expect(ctx.transactionRepository.saved).toHaveLength(2);
    expect(ctx.fileStorage.calls).toHaveLength(1);
    expect(ctx.dataCatalog.ensureDatabaseCalls).toContain("fincard_loyalty");
    expect(ctx.dataCatalog.registerBatchCalls).toHaveLength(2); // PART01 y PART02
  });

  it("PROCESAMIENTO PARCIAL: filas con error se rechazan, las validas se procesan", async () => {
    const result = await execute(
      ctx,
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN002,BAD,PART01,80,0,2026-07-01,Cafe Central`,
    );

    if (result.outcome !== "processed") throw new Error("unreachable");
    expect(result.validRows).toBe(1);
    expect(result.rejectedRows).toBe(1);
    expect(result.rowErrors[0]).toMatchObject({ row: 2, column: "member_id" });
    expect(ctx.transactionRepository.saved).toHaveLength(1); // solo la valida
  });

  it("separa las flaggeadas por RN: no liquidan pero quedan en su propio repositorio", async () => {
    const result = await execute(
      ctx,
      `${HEADER}\nTXN001,MEM001,PART01,10,0,2030-01-01,Cafe Central`, // RN-04: futura
    );

    if (result.outcome !== "processed") throw new Error("unreachable");
    expect(result.validRows).toBe(1); // paso schema
    expect(result.flaggedCount).toBe(1); // pero quedo en revision
    expect(ctx.transactionRepository.saved).toHaveLength(0); // NO liquida
    expect(ctx.flaggedTransactionRepository.saved).toHaveLength(1);
    expect(
      ctx.flaggedTransactionRepository.saved[0]!.flagged.reasons[0]!.rule,
    ).toBe("RN-04");
  });

  it("rechaza el archivo COMPLETO si faltan columnas requeridas (error estructural)", async () => {
    const result = await execute(
      ctx,
      "transaction_id,member_id\nTXN001,MEM001",
    );
    expect(result.outcome).toBe("invalid_file");
    if (result.outcome !== "invalid_file") throw new Error("unreachable");
    expect(result.message).toMatch(/Columnas faltantes/);
    expect(ctx.fileStorage.calls).toHaveLength(0); // sin efectos secundarios
  });

  it("rechaza archivo vacio como invalid_file", async () => {
    const result = await execute(ctx, "");
    expect(result.outcome).toBe("invalid_file");
  });

  it("el manifest refleja los mismos numeros que la respuesta", async () => {
    const result = await execute(
      ctx,
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN002,BAD,PART01,80,0,2026-07-01,Cafe Central\nTXN003,MEM003,PART01,10,0,2030-01-01,Cafe Central`,
    );
    if (result.outcome !== "processed") throw new Error("unreachable");
    expect(result.manifest.totalValidRows).toBe(result.validRows);
    expect(result.manifest.totalRejectedRows).toBe(result.rejectedRows);
    expect(result.manifest.totalFlaggedRows).toBe(result.flaggedCount);
    expect(result.manifest.processedAt).toBe(NOW.toISOString());
  });
});
