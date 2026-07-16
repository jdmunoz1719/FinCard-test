import { IFlaggedTransactionRepository } from "../../domain/repositories/IFlaggedTransactionRepository";
import {
  GetFlaggedTransactionsInput,
  GetFlaggedTransactionsOutput,
  IGetFlaggedTransactionsUseCase,
} from "../../domain/use-cases/IGetFlaggedTransactionsUseCase";
import { PartnerId } from "../../domain/value-objects/PartnerId";

export interface GetFlaggedTransactionsDeps {
  flaggedTransactionRepository: IFlaggedTransactionRepository;
}

/**
 * Lista transacciones "sujetas a revision" (RF-05), con filtro opcional por
 * aliado. Da visibilidad operativa sobre transactions_flagged sin mezclarla
 * con la liquidacion.
 */
export class GetFlaggedTransactionsUseCase implements IGetFlaggedTransactionsUseCase {
  constructor(private readonly deps: GetFlaggedTransactionsDeps) {}

  public async execute(
    input: GetFlaggedTransactionsInput,
  ): Promise<GetFlaggedTransactionsOutput> {
    if (input.partnerId !== undefined && !PartnerId.isValid(input.partnerId)) {
      return {
        outcome: "invalid_input",
        message: `partner_id invalido: "${input.partnerId}"`,
      };
    }

    const result = await this.deps.flaggedTransactionRepository.findAll(
      input.partnerId ? { partnerId: input.partnerId } : undefined,
    );
    if (result.isFail) {
      throw new Error(
        `No se pudieron consultar las transacciones flaggeadas: ${result.error.message}`,
      );
    }

    return { outcome: "ok", flagged: result.value };
  }
}
