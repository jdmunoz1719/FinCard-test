import { FastifyReply, FastifyRequest } from "fastify";
import { SettlementMapper } from "../../../application/mappers/SettlementMapper";
import { IGetSettlementUseCase } from "../../../domain/use-cases/IGetSettlementUseCase";

interface SettlementParams {
  partner_id: string;
}

interface SettlementQuery {
  from?: string;
  to?: string;
}

/**
 * Controller HTTP de la consulta de liquidacion (RF-04). Traduce el outcome
 * del use case a HTTP: ok -> 200 + SettlementResponse, partner_not_found ->
 * 404, invalid_input -> 400. No contiene logica de negocio.
 */
export class SettlementController {
  constructor(
    private readonly getSettlementUseCase: IGetSettlementUseCase,
    private readonly mapper: SettlementMapper = new SettlementMapper(),
  ) {}

  public async getSettlement(
    request: FastifyRequest<{
      Params: SettlementParams;
      Querystring: SettlementQuery;
    }>,
    reply: FastifyReply,
  ): Promise<void> {
    const { partner_id: partnerId } = request.params;
    const { from, to } = request.query;

    // Presencia de query params: validacion de transporte, no de negocio.
    if (!from || !to) {
      reply
        .status(400)
        .send({
          error: "Los query params 'from' y 'to' son requeridos (YYYY-MM-DD)",
        });
      return;
    }

    const result = await this.getSettlementUseCase.execute({
      partnerId,
      from,
      to,
    });

    if (result.outcome === "invalid_input") {
      reply.status(400).send({ error: result.message });
      return;
    }
    if (result.outcome === "partner_not_found") {
      reply.status(404).send({ error: `Aliado no encontrado: ${partnerId}` });
      return;
    }

    reply.status(200).send(this.mapper.toResponse(result.settlement));
  }
}
