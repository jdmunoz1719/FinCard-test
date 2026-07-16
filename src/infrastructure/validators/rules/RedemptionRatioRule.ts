import { Transaction } from "../../../domain/entities/Transaction";
import { FlagReason } from "../../../domain/value-objects/FlagReason";
import { MAX_DAILY_REDEMPTION_RATIO } from "../../../shared/constants/validation.constants";
import { addFlag, CrossValidationRule, RuleFlags } from "./CrossValidationRule";

/**
 * RN-02: un aliado no puede tener mas del 30% de sus transacciones diarias
 * con points_redeemed > 0 (posible fraude). Es una regla de proporcion, no de
 * orden: al superarse el ratio se marcan todas las transacciones con
 * redemption del grupo (no solo "las adicionales"). Sin piso minimo de
 * muestra: un aliado con 1 sola transaccion del dia ya puede dar 100% y marcarse.
 */
export class RedemptionRatioRule implements CrossValidationRule {
  public readonly ruleId = "RN-02";

  constructor(
    private readonly maxRedemptionRatio: number = MAX_DAILY_REDEMPTION_RATIO,
  ) {}

  public evaluate(transactions: Transaction[]): RuleFlags {
    const flags: RuleFlags = new Map();

    // Agrupar por (aliado, dia): la proporcion se mide por dia por aliado.
    const groups = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = `${t.partnerId.value}|${t.transactionDate.toString()}`;
      const group = groups.get(key) ?? [];
      group.push(t);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      const withRedemption = group.filter((t) => t.hasRedemption());
      const ratio = withRedemption.length / group.length;
      if (ratio > this.maxRedemptionRatio) {
        for (const t of withRedemption) {
          addFlag(
            flags,
            t.transactionId.value,
            FlagReason.redemptionRatioExceeded(),
          );
        }
      }
    }
    return flags;
  }
}
