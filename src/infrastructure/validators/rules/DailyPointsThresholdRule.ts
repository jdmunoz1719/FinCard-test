import { Transaction } from "../../../domain/entities/Transaction";
import { FlagReason } from "../../../domain/value-objects/FlagReason";
import { MAX_DAILY_NET_POINTS_PER_MEMBER } from "../../../shared/constants/validation.constants";
import { addFlag, CrossValidationRule, RuleFlags } from "./CrossValidationRule";

/**
 * RN-01: un miembro no puede acumular mas de 10,000 puntos netos en un mismo
 * dia. Acumula por (miembro, dia) en el orden del archivo; una vez alcanzado
 * el tope, cada transaccion adicional de ese miembro/dia se flaggea (las que
 * cruzaron el umbral "legitimamente" quedan validas).
 */
export class DailyPointsThresholdRule implements CrossValidationRule {
  public readonly ruleId = "RN-01";

  constructor(
    private readonly maxDailyNetPoints: number = MAX_DAILY_NET_POINTS_PER_MEMBER,
  ) {}

  public evaluate(transactions: Transaction[]): RuleFlags {
    const flags: RuleFlags = new Map();
    const runningTotals = new Map<string, number>();

    for (const t of transactions) {
      const key = `${t.memberId.value}|${t.transactionDate.toString()}`;
      const totalBefore = runningTotals.get(key) ?? 0;
      if (totalBefore >= this.maxDailyNetPoints) {
        addFlag(flags, t.transactionId.value, FlagReason.dailyPointsExceeded());
      }
      runningTotals.set(key, totalBefore + t.netPoints());
    }
    return flags;
  }
}
