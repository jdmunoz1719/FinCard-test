import { PersistedFlaggedTransaction } from "../repositories/IFlaggedTransactionRepository";

export interface GetFlaggedTransactionsInput {
  /** Filtro opcional por aliado (formato PART + 2 digitos si se envia). */
  partnerId?: string;
}

export type GetFlaggedTransactionsOutput =
  | { outcome: "invalid_input"; message: string }
  | { outcome: "ok"; flagged: PersistedFlaggedTransaction[] };

/** Listado de transacciones "sujetas a revision" (RF-05), con filtro opcional por aliado. */
export interface IGetFlaggedTransactionsUseCase {
  execute(
    input: GetFlaggedTransactionsInput,
  ): Promise<GetFlaggedTransactionsOutput>;
}
