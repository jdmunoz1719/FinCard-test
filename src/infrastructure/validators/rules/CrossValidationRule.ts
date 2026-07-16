import { Transaction } from "../../../domain/entities/Transaction";
import { FlagReason } from "../../../domain/value-objects/FlagReason";

/** Mapa transactionId -> motivos que ESTA regla le asigna. */
export type RuleFlags = Map<string, FlagReason[]>;

/**
 * Contrato comun de las reglas de validacion cruzada (RN-01..RN-04): cada
 * implementacion recibe el batch completo (necesita contexto de multiples
 * filas) y devuelve que transacciones marca y por que. La composicion
 * (correrlas todas y fusionar motivos) es del BusinessRulesValidator.
 *
 * Las reglas "de acumulado" (RN-01, RN-03) son sensibles al orden del
 * archivo: marcan las filas adicionales que llegan despues de cruzar el umbral.
 */
export interface CrossValidationRule {
  /** Identificador de la regla (RN-01..RN-04), util para logs y tests. */
  readonly ruleId: string;

  evaluate(transactions: Transaction[]): RuleFlags;
}

/** Helper compartido: agrega un motivo al mapa de banderas de una regla. */
export function addFlag(
  flags: RuleFlags,
  transactionId: string,
  reason: FlagReason,
): void {
  const existing = flags.get(transactionId) ?? [];
  existing.push(reason);
  flags.set(transactionId, existing);
}
