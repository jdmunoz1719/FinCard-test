import { FastifyInstance } from "fastify";
import { SettlementController } from "../controllers/SettlementController";
import { getSettlementSchema } from "../schemas/getSettlement.schema";

/** Registra GET /api/v1/settlements/:partner_id (RF-04). */
export function registerSettlementsRoutes(
  app: FastifyInstance,
  controller: SettlementController,
): void {
  app.get<{
    Params: { partner_id: string };
    Querystring: { from?: string; to?: string };
  }>(
    "/api/v1/settlements/:partner_id",
    { schema: getSettlementSchema },
    (request, reply) => controller.getSettlement(request, reply),
  );
}
