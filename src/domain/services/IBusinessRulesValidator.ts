import { FlaggedTransaction } from "../entities/FlaggedTransaction";
import { Transaction } from "../entities/Transaction";

export interface BusinessRulesEvaluation {
  valid: Transaction[];
  flagged: FlaggedTransaction[];
}

/**
 * Puerto de las reglas cruzadas RN-01..04 (RF-05): reciben transacciones ya
 * validas a nivel de schema y deciden cuales quedan "sujetas a revision".
 * La implementacion compone una estrategia por regla — agregar RN-05 no
 * toca este contrato ni los use cases.
 */
export interface IBusinessRulesValidator {
  evaluate(transactions: Transaction[]): BusinessRulesEvaluation;
}
