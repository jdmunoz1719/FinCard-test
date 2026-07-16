import { FlaggedTransaction } from "../../domain/entities/FlaggedTransaction";
import { Transaction } from "../../domain/entities/Transaction";
import {
  BusinessRulesEvaluation,
  IBusinessRulesValidator,
} from "../../domain/services/IBusinessRulesValidator";
import { FlagReason } from "../../domain/value-objects/FlagReason";
import { CrossValidationRule } from "./rules/CrossValidationRule";

/**
 * Compone las reglas de negocio cruzadas (RF-05): corre cada estrategia
 * RN-01..RN-04 sobre el batch, fusiona los motivos por transaccion y
 * particiona validas vs flaggeadas. Agregar RN-05 es pasar una estrategia
 * mas al constructor, sin tocar esta clase (OCP).
 *
 * Alcance (ADR-006): evalua solo el batch recibido, no el historico
 * persistido de dias/cargas anteriores.
 */
export class BusinessRulesValidator implements IBusinessRulesValidator {
  constructor(private readonly rules: CrossValidationRule[]) {}

  public evaluate(transactions: Transaction[]): BusinessRulesEvaluation {
    // Fusionar los motivos de TODAS las reglas por transactionId.
    const reasonsByTxnId = new Map<string, FlagReason[]>();
    for (const rule of this.rules) {
      for (const [transactionId, reasons] of rule.evaluate(transactions)) {
        const existing = reasonsByTxnId.get(transactionId) ?? [];
        existing.push(...reasons);
        reasonsByTxnId.set(transactionId, existing);
      }
    }

    // Particionar preservando el orden original del archivo.
    const valid: Transaction[] = [];
    const flagged: FlaggedTransaction[] = [];
    for (const t of transactions) {
      const reasons = reasonsByTxnId.get(t.transactionId.value);
      if (reasons && reasons.length > 0)
        flagged.push(FlaggedTransaction.create(t, reasons));
      else valid.push(t);
    }
    return { valid, flagged };
  }
}
