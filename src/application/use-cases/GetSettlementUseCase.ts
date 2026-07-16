import { IPartnerRepository } from "../../domain/repositories/IPartnerRepository";
import { ITransactionRepository } from "../../domain/repositories/ITransactionRepository";
import {
  GetSettlementInput,
  GetSettlementOutput,
  IGetSettlementUseCase,
} from "../../domain/use-cases/IGetSettlementUseCase";
import { PartnerId } from "../../domain/value-objects/PartnerId";
import { TransactionDate } from "../../domain/value-objects/TransactionDate";
import { SettlementCalculator } from "../services/SettlementCalculator";

export interface GetSettlementDeps {
  transactionRepository: ITransactionRepository;
  partnerRepository: IPartnerRepository;
  settlementCalculator: SettlementCalculator;
}

/**
 * Orquesta la consulta de liquidacion (RF-04): valida entrada, resuelve el
 * aliado, trae las transacciones validas del rango y delega la aritmetica a
 * SettlementCalculator (funcion pura). Las flaggeadas nunca aparecen aqui
 * ITransactionRepository solo conoce transacciones validas.
 */
export class GetSettlementUseCase implements IGetSettlementUseCase {
  constructor(private readonly deps: GetSettlementDeps) {}

  public async execute(input: GetSettlementInput): Promise<GetSettlementOutput> {
    // Validacion de entrada: responde 400 sin tocar infraestructura.
    if (!PartnerId.isValid(input.partnerId)) {
      return { outcome: "invalid_input", message: `partner_id invalido: "${input.partnerId}"` };
    }
    if (!TransactionDate.isValid(input.from) || !TransactionDate.isValid(input.to)) {
      return {
        outcome: "invalid_input",
        message: "from/to deben ser fechas validas en formato YYYY-MM-DD",
      };
    }
    const from = TransactionDate.create(input.from);
    const to = TransactionDate.create(input.to);
    if (from.isAfter(to)) {
      return { outcome: "invalid_input", message: "from no puede ser posterior a to" };
    }

    // Resolucion del aliado (404 si no existe en los datos de referencia).
    const partnerResult = await this.deps.partnerRepository.findById(input.partnerId);
    if (partnerResult.isFail) {
      throw new Error(`No se pudo consultar el aliado: ${partnerResult.error.message}`);
    }
    const partner = partnerResult.value;
    if (!partner) {
      return { outcome: "partner_not_found" };
    }

    // Transacciones validas del periodo + calculo puro.
    const transactionsResult = await this.deps.transactionRepository.findByPartnerAndDateRange(
      PartnerId.create(input.partnerId),
      from,
      to,
    );
    if (transactionsResult.isFail) {
      throw new Error(`No se pudieron consultar las transacciones: ${transactionsResult.error.message}`);
    }

    const settlement = this.deps.settlementCalculator.calculate(
      partner,
      transactionsResult.value,
      input.from,
      input.to,
    );

    return { outcome: "ok", settlement };
  }
}
