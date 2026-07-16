import { FastifyReply, FastifyRequest } from "fastify";
import { FlaggedTransactionMapper } from "../../../application/mappers/FlaggedTransactionMapper";
import { IGetFlaggedTransactionsUseCase } from "../../../domain/use-cases/IGetFlaggedTransactionsUseCase";

interface FlaggedQuery {
  partner_id?: string;
}

/**
 * Controller HTTP del listado de transacciones "sujetas a revision" (RF-05).
 * GET /api/v1/transactions/flagged -> ok: 200 + {total, flagged[]}; invalid_input: 400.
 * No contiene logica de negocio.
 */
export class FlaggedTransactionController {
  constructor(
    private readonly getFlaggedUseCase: IGetFlaggedTransactionsUseCase,
    private readonly mapper: FlaggedTransactionMapper = new FlaggedTransactionMapper(),
  ) {}

  public async getFlagged(
    request: FastifyRequest<{ Querystring: FlaggedQuery }>,
    reply: FastifyReply,
  ): Promise<void> {
    const result = await this.getFlaggedUseCase.execute({
      partnerId: request.query.partner_id,
    });

    if (result.outcome === "invalid_input") {
      reply.status(400).send({ error: result.message });
      return;
    }

    const flagged = result.flagged.map((record) =>
      this.mapper.toResponse(record),
    );
    reply.status(200).send({ total: flagged.length, flagged });
  }
}
