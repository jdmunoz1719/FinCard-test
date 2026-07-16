import { Transaction } from "../../../domain/entities/Transaction";
import { FlagReason } from "../../../domain/value-objects/FlagReason";
import { MAX_DAILY_TRANSACTIONS_PER_MEMBER_PARTNER } from "../../../shared/constants/validation.constants";
import { addFlag, CrossValidationRule, RuleFlags } from "./CrossValidationRule";

/**
 * RN-03: si un miembro tiene mas de 5 transacciones el mismo dia con el mismo
 * aliado, las adicionales (6ta en adelante) se marcan "sujetas a revision".
 * Cuenta por (miembro, aliado, dia) en el orden del archivo.
 */
export class MemberDailyTransactionLimitRule implements CrossValidationRule {
  public readonly ruleId = "RN-03";

  constructor(
    private readonly maxDailyTransactions: number = MAX_DAILY_TRANSACTIONS_PER_MEMBER_PARTNER,
  ) {}

  public evaluate(transactions: Transaction[]): RuleFlags {
    const flags: RuleFlags = new Map();
    const counters = new Map<string, number>();

    for (const t of transactions) {
      const key = `${t.memberId.value}|${t.partnerId.value}|${t.transactionDate.toString()}`;
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      if (count > this.maxDailyTransactions) {
        addFlag(
          flags,
          t.transactionId.value,
          FlagReason.memberDailyLimitExceeded(),
        );
      }
    }
    return flags;
  }
}
