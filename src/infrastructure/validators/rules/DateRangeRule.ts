import { Transaction } from "../../../domain/entities/Transaction";
import { IDateProvider } from "../../../domain/services/IDateProvider";
import { FlagReason } from "../../../domain/value-objects/FlagReason";
import { MAX_TRANSACTION_AGE_YEARS } from "../../../shared/constants/validation.constants";
import { addFlag, CrossValidationRule, RuleFlags } from "./CrossValidationRule";

/**
 * RN-04: transaction_date no puede ser futura ni tener mas de 2 anios de
 * antiguedad. A diferencia de las otras reglas es por-fila (no necesita
 * contexto cruzado), pero se modela igual como estrategia para que
 * BusinessRulesValidator componga todas las RN de forma uniforme. Recibe
 * IDateProvider en vez de usar new Date() para que los tests sean deterministas.
 */
export class DateRangeRule implements CrossValidationRule {
  public readonly ruleId = "RN-04";

  constructor(
    private readonly dateProvider: IDateProvider,
    private readonly maxAgeYears: number = MAX_TRANSACTION_AGE_YEARS,
  ) {}

  public evaluate(transactions: Transaction[]): RuleFlags {
    const flags: RuleFlags = new Map();
    const now = this.dateProvider.now();

    for (const t of transactions) {
      if (t.transactionDate.isFutureRelativeTo(now)) {
        addFlag(
          flags,
          t.transactionId.value,
          FlagReason.dateOutOfRange("transaction_date es una fecha futura"),
        );
      } else if (t.transactionDate.isOlderThanYears(this.maxAgeYears, now)) {
        addFlag(
          flags,
          t.transactionId.value,
          FlagReason.dateOutOfRange(
            `transaction_date supera la antiguedad maxima de ${this.maxAgeYears} anios`,
          ),
        );
      }
    }
    return flags;
  }
}
