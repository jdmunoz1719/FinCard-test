/** Tests de integracion HTTP (app.inject, sin puerto real): los 3 endpoints + health, contrato wire completo. */

import { describe, expect, it } from "vitest";
import { FlaggedTransactionMapper } from "../../../application/mappers/FlaggedTransactionMapper";
import { SettlementMapper } from "../../../application/mappers/SettlementMapper";
import { UploadResultMapper } from "../../../application/mappers/UploadResultMapper";
import { SettlementCalculator } from "../../../application/services/SettlementCalculator";
import { GetFlaggedTransactionsUseCase } from "../../../application/use-cases/GetFlaggedTransactionsUseCase";
import { GetSettlementUseCase } from "../../../application/use-cases/GetSettlementUseCase";
import { UploadTransactionsUseCase } from "../../../application/use-cases/UploadTransactionsUseCase";
import {
  FakePartnerRepository,
  FixedDateProvider,
  FixedIdGenerator,
  InMemoryCatalogPort,
  InMemoryFlaggedRepository,
  InMemoryStoragePort,
  InMemoryTransactionRepository,
} from "../../../test-support/fakes";
import { buildMultipartCsv } from "../../../test-support/multipart";
import { CsvParser } from "../../csv/CsvParser";
import { CryptoHashGenerator } from "../../hash/CryptoHashGenerator";
import { BusinessRulesValidator } from "../../validators/BusinessRulesValidator";
import { DataQualityValidator } from "../../validators/DataQualityValidator";
import { DailyPointsThresholdRule } from "../../validators/rules/DailyPointsThresholdRule";
import { DateRangeRule } from "../../validators/rules/DateRangeRule";
import { MemberDailyTransactionLimitRule } from "../../validators/rules/MemberDailyTransactionLimitRule";
import { RedemptionRatioRule } from "../../validators/rules/RedemptionRatioRule";
import { FlaggedTransactionController } from "../controllers/FlaggedTransactionController";
import { SettlementController } from "../controllers/SettlementController";
import { TransactionController } from "../controllers/TransactionController";
import { buildServer } from "./FastifyServer";

const HEADER =
  "transaction_id,member_id,partner_id,points_earned,points_redeemed,transaction_date,partner_name";
const NOW = new Date("2026-07-14T00:00:00Z");

function buildTestApp() {
  const dateProvider = new FixedDateProvider(NOW);
  const transactionRepository = new InMemoryTransactionRepository();
  const flaggedTransactionRepository = new InMemoryFlaggedRepository();
  const partnerRepository = new FakePartnerRepository([
    { partnerId: "PART01", partnerName: "Cafe Central" },
  ]);

  const uploadUseCase = new UploadTransactionsUseCase({
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
    fileStorage: new InMemoryStoragePort(),
    dataCatalog: new InMemoryCatalogPort(),
    hashGenerator: new CryptoHashGenerator(),
    idGenerator: new FixedIdGenerator("batch-1"),
    dateProvider,
  });

  const settlementUseCase = new GetSettlementUseCase({
    transactionRepository,
    partnerRepository,
    settlementCalculator: new SettlementCalculator(),
  });

  const flaggedUseCase = new GetFlaggedTransactionsUseCase({
    flaggedTransactionRepository,
  });

  return buildServer({
    transactionController: new TransactionController(
      uploadUseCase,
      new UploadResultMapper(),
    ),
    settlementController: new SettlementController(
      settlementUseCase,
      new SettlementMapper(),
    ),
    flaggedTransactionController: new FlaggedTransactionController(
      flaggedUseCase,
      new FlaggedTransactionMapper(),
    ),
    enableLogger: false,
  });
}

function uploadRequest(csv: string, filename = "transactions.csv") {
  return {
    method: "POST" as const,
    url: "/api/v1/transactions/upload",
    ...buildMultipartCsv(filename, csv),
  };
}

describe("HTTP API", () => {
  describe("POST /api/v1/transactions/upload", () => {
    it("200 con el contrato completo cuando el archivo es valido", async () => {
      const app = buildTestApp();
      const response = await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central`,
        ),
      );
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        batch_id: "batch-1",
        total_rows: 1,
        valid_rows: 1,
        rejected_rows: 0,
        flagged_count: 0,
      });
      expect(body.manifest.original_file_sha256).toHaveLength(64);
      expect(body.storage_path).toMatch(/batch-1/);
      await app.close();
    });

    it("200 PARCIAL: reporta filas rechazadas con fila/columna y procesa las validas", async () => {
      const app = buildTestApp();
      const response = await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN002,BAD,PART01,80,0,2026-07-01,Cafe Central`,
        ),
      );
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.valid_rows).toBe(1);
      expect(body.rejected_rows).toBe(1);
      expect(body.errors[0]).toMatchObject({ row: 2, column: "member_id" });
      await app.close();
    });

    it("400 si faltan columnas requeridas (error estructural: nada se procesa)", async () => {
      const app = buildTestApp();
      const response = await app.inject(
        uploadRequest("transaction_id,member_id\nTXN001,MEM001"),
      );
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/Columnas faltantes/);
      await app.close();
    });

    it("400 si el archivo esta vacio", async () => {
      const app = buildTestApp();
      const response = await app.inject(uploadRequest(""));
      expect(response.statusCode).toBe(400);
      await app.close();
    });

    it("400 si la extension no es .csv", async () => {
      const app = buildTestApp();
      const response = await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central`,
          "data.txt",
        ),
      );
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/\.csv/);
      await app.close();
    });

    it("400 si no se envia ningun archivo", async () => {
      const app = buildTestApp();
      const boundary = "----EmptyBoundary";
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/transactions/upload",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload: `--${boundary}--\r\n`,
      });
      expect(response.statusCode).toBe(400);
      await app.close();
    });
  });

  describe("GET /api/v1/settlements/:partner_id", () => {
    it("200 con summary y daily_breakdown despues de un upload", async () => {
      const app = buildTestApp();
      await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central`,
        ),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/settlements/PART01?from=2026-07-01&to=2026-07-02",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.partner_id).toBe("PART01");
      expect(body.summary.total_transactions).toBe(1);
      expect(body.daily_breakdown).toHaveLength(2);
      await app.close();
    });

    it("las flaggeadas NO afectan la liquidacion (RF-05)", async () => {
      const app = buildTestApp();
      // Fecha futura -> RN-04 -> flagged, no debe liquidar.
      await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,999,0,2030-01-01,Cafe Central`,
        ),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/settlements/PART01?from=2030-01-01&to=2030-01-01",
      });
      expect(response.json().summary.total_transactions).toBe(0);
      await app.close();
    });

    it("404 si el aliado no existe", async () => {
      const app = buildTestApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/settlements/PART99?from=2026-07-01&to=2026-07-02",
      });
      expect(response.statusCode).toBe(404);
      await app.close();
    });

    it("400 si faltan los query params from/to", async () => {
      const app = buildTestApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/settlements/PART01",
      });
      expect(response.statusCode).toBe(400);
      await app.close();
    });
  });

  describe("GET /api/v1/transactions/flagged", () => {
    it("200 con las flaggeadas del batch, incluyendo motivos con codigo y regla", async () => {
      const app = buildTestApp();
      await app.inject(
        uploadRequest(
          `${HEADER}\nTXN001,MEM001,PART01,10,0,2030-01-01,Cafe Central`,
        ),
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/transactions/flagged",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.total).toBe(1);
      expect(body.flagged[0]).toMatchObject({
        transaction_id: "TXN001",
        batch_id: "batch-1",
      });
      expect(body.flagged[0].flag_reasons[0]).toMatchObject({
        code: "DATE_OUT_OF_RANGE",
        rule: "RN-04",
      });
      await app.close();
    });

    it("filtra por partner_id y 400 si el filtro es invalido", async () => {
      const app = buildTestApp();
      const empty = await app.inject({
        method: "GET",
        url: "/api/v1/transactions/flagged?partner_id=PART02",
      });
      expect(empty.json().total).toBe(0);

      const bad = await app.inject({
        method: "GET",
        url: "/api/v1/transactions/flagged?partner_id=NOPE",
      });
      expect(bad.statusCode).toBe(400);
      await app.close();
    });
  });

  it("GET /health responde ok", async () => {
    const app = buildTestApp();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
