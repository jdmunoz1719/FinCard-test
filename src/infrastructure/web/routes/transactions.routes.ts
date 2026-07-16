import { FastifyInstance } from "fastify";
import { FlaggedTransactionController } from "../controllers/FlaggedTransactionController";
import {
  TransactionController,
  UploadRequestBody,
} from "../controllers/TransactionController";
import { getFlaggedTransactionsSchema } from "../schemas/getFlaggedTransactions.schema";
import { buildUploadTransactionsSchema } from "../schemas/uploadTransactions.schema";

/**
 * Registra:
 * - POST /api/v1/transactions/upload   (RF-01..RF-03, RF-05)
 * - GET  /api/v1/transactions/flagged  (RF-05: visibilidad de revision)
 */
export function registerTransactionsRoutes(
  app: FastifyInstance,
  transactionController: TransactionController,
  flaggedController: FlaggedTransactionController,
): void {
  app.post<{ Body: UploadRequestBody }>(
    "/api/v1/transactions/upload",
    { schema: buildUploadTransactionsSchema() },
    (request, reply) => transactionController.upload(request, reply),
  );

  app.get<{ Querystring: { partner_id?: string } }>(
    "/api/v1/transactions/flagged",
    { schema: getFlaggedTransactionsSchema },
    (request, reply) => flaggedController.getFlagged(request, reply),
  );
}
