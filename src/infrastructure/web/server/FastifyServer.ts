import { ajvFilePlugin } from "@fastify/multipart";
import Fastify, { FastifyInstance } from "fastify";
import { FlaggedTransactionController } from "../controllers/FlaggedTransactionController";
import { SettlementController } from "../controllers/SettlementController";
import { TransactionController } from "../controllers/TransactionController";
import { errorHandler } from "../middleware/errorHandler";
import { registerHealthRoutes } from "../routes/health.routes";
import { registerSettlementsRoutes } from "../routes/settlements.routes";
import { registerTransactionsRoutes } from "../routes/transactions.routes";
import { registerMultipart } from "./plugins/multipart.plugin";
import { registerSwagger } from "./plugins/swagger.plugin";

export interface ServerDeps {
  transactionController: TransactionController;
  settlementController: SettlementController;
  flaggedTransactionController: FlaggedTransactionController;
  enableLogger: boolean;
}

/**
 * Construye la instancia de Fastify lista para listen() o inject() (tests).
 * Recibe los controllers ya armados: el cableado de dependencias es del
 * composition root (index.ts), no de esta capa.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({
    logger: deps.enableLogger,
    bodyLimit: 10 * 1024 * 1024,
    // ajvFilePlugin agrega la keyword `isFile` que el schema del upload usa
    // para validar el campo de archivo (ver uploadTransactions.schema.ts).
    // Cast: el tipo Plugin<T> de ajv espera (ajv, opts) => Ajv; ajvFilePlugin
    // retorna void (solo registra la keyword) -- mismatch de tipos, no de runtime.
    ajv: { plugins: [ajvFilePlugin as unknown as never] },
  });

  registerSwagger(app);
  registerMultipart(app);

  app.register(async (instance) => {
    registerHealthRoutes(instance);
    registerTransactionsRoutes(
      instance,
      deps.transactionController,
      deps.flaggedTransactionController,
    );
    registerSettlementsRoutes(instance, deps.settlementController);
  });

  app.setErrorHandler(errorHandler);

  return app;
}
