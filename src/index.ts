/**
 * @file index.ts
 * @description COMPOSITION ROOT: el unico lugar del sistema que conoce las
 *              clases concretas. Carga la configuracion, instancia los
 *              adapters, los inyecta en los use cases a traves de sus ports,
 *              arma los controllers y levanta el servidor.
 *
 *              Para migrar a AWS real: reemplazar aqui
 *              LocalFileStorageRepository -> S3FileStorageRepository y
 *              LocalDataCatalogRepository -> GlueDataCatalogRepository.
 *              Nada mas cambia (patron Strategy por ambiente).
 * @layer bootstrap
 * @dependencies todas las implementaciones concretas (solo aqui)
 */

import { join } from "node:path";
import { FlaggedTransactionMapper } from "./application/mappers/FlaggedTransactionMapper";
import { SettlementMapper } from "./application/mappers/SettlementMapper";
import { UploadResultMapper } from "./application/mappers/UploadResultMapper";
import { SettlementCalculator } from "./application/services/SettlementCalculator";
import { GetFlaggedTransactionsUseCase } from "./application/use-cases/GetFlaggedTransactionsUseCase";
import { GetSettlementUseCase } from "./application/use-cases/GetSettlementUseCase";
import { UploadTransactionsUseCase } from "./application/use-cases/UploadTransactionsUseCase";
import { loadConfigFromEnv } from "./infrastructure/config/env.config";
import { CsvParser } from "./infrastructure/csv/CsvParser";
import { LocalDataCatalogRepository } from "./infrastructure/data-catalog/LocalDataCatalogRepository";
import { SystemDateProvider } from "./infrastructure/date/SystemDateProvider";
import { CryptoHashGenerator } from "./infrastructure/hash/CryptoHashGenerator";
import { UuidGenerator } from "./infrastructure/id/UuidGenerator";
import { FileFlaggedTransactionRepository } from "./infrastructure/persistence/file/FileFlaggedTransactionRepository";
import { FileTransactionRepository } from "./infrastructure/persistence/file/FileTransactionRepository";
import { JsonPartnerRepository } from "./infrastructure/persistence/file/JsonPartnerRepository";
import { LocalFileStorageRepository } from "./infrastructure/storage/LocalFileStorageRepository";
import { BusinessRulesValidator } from "./infrastructure/validators/BusinessRulesValidator";
import { DataQualityValidator } from "./infrastructure/validators/DataQualityValidator";
import { DailyPointsThresholdRule } from "./infrastructure/validators/rules/DailyPointsThresholdRule";
import { DateRangeRule } from "./infrastructure/validators/rules/DateRangeRule";
import { MemberDailyTransactionLimitRule } from "./infrastructure/validators/rules/MemberDailyTransactionLimitRule";
import { RedemptionRatioRule } from "./infrastructure/validators/rules/RedemptionRatioRule";
import { FlaggedTransactionController } from "./infrastructure/web/controllers/FlaggedTransactionController";
import { SettlementController } from "./infrastructure/web/controllers/SettlementController";
import { TransactionController } from "./infrastructure/web/controllers/TransactionController";
import { buildServer } from "./infrastructure/web/server/FastifyServer";

// --- 1. Configuracion (unico punto que toca process.env) ------------------
const config = loadConfigFromEnv();

// --- 2. Adapters de infraestructura (implementan los ports del dominio) ---
const dateProvider = new SystemDateProvider();
const transactionRepository = new FileTransactionRepository(
  join(config.storageRoot, "db", "transactions.jsonl"),
);
const flaggedTransactionRepository = new FileFlaggedTransactionRepository(
  join(config.storageRoot, "db", "transactions_flagged.jsonl"),
);
const partnerRepository = new JsonPartnerRepository(
  join(config.referenceDataRoot, "partners.json"),
);
const fileStorage = new LocalFileStorageRepository(config.storageRoot);
const dataCatalog = new LocalDataCatalogRepository(
  join(config.storageRoot, "glue-catalog.json"),
);

// --- 3. Validadores: reglas RN como estrategias componibles ---------------
const businessRulesValidator = new BusinessRulesValidator([
  new DailyPointsThresholdRule(), // RN-01
  new RedemptionRatioRule(), // RN-02
  new MemberDailyTransactionLimitRule(), // RN-03
  new DateRangeRule(dateProvider), // RN-04
]);

// --- 4. Use cases: reciben SOLO interfaces (DIP) ---------------------------
const uploadTransactionsUseCase = new UploadTransactionsUseCase({
  csvParser: new CsvParser(),
  dataQualityValidator: new DataQualityValidator(),
  businessRulesValidator,
  transactionRepository,
  flaggedTransactionRepository,
  fileStorage,
  dataCatalog,
  hashGenerator: new CryptoHashGenerator(),
  idGenerator: new UuidGenerator(),
  dateProvider,
});

const getSettlementUseCase = new GetSettlementUseCase({
  transactionRepository,
  partnerRepository,
  settlementCalculator: new SettlementCalculator(),
});

const getFlaggedTransactionsUseCase = new GetFlaggedTransactionsUseCase({
  flaggedTransactionRepository,
});

// --- 5. Adaptador web: controllers + servidor ------------------------------
const app = buildServer({
  transactionController: new TransactionController(
    uploadTransactionsUseCase,
    new UploadResultMapper(),
  ),
  settlementController: new SettlementController(
    getSettlementUseCase,
    new SettlementMapper(),
  ),
  flaggedTransactionController: new FlaggedTransactionController(
    getFlaggedTransactionsUseCase,
    new FlaggedTransactionMapper(),
  ),
  enableLogger: config.enableLogger,
});

app
  .listen({ port: config.port, host: config.host })
  .then(() => {
    app.log.info(
      `FinCard settlement API escuchando en http://${config.host}:${config.port}`,
    );
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
