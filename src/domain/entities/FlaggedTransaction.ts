import { FlagReason } from "../value-objects/FlagReason";
import { Transaction } from "./Transaction";

/**
 * Una transaccion "sujeta a revision" por una o mas reglas RN-01..04 (RF-05).
 * Vive separada en transactions_flagged y nunca entra en la liquidacion.
 */
export class FlaggedTransaction {
  private constructor(
    public readonly transaction: Transaction,
    public readonly reasons: FlagReason[],
  ) {}

  public static create(
    transaction: Transaction,
    reasons: FlagReason[],
  ): FlaggedTransaction {
    if (reasons.length === 0) {
      throw new Error(
        "FlaggedTransaction requiere al menos un motivo de bandera",
      );
    }
    return new FlaggedTransaction(transaction, reasons);
  }

  public toPersistence() {
    return {
      ...this.transaction.toPersistence(),
      flagReasons: this.reasons.map((r) => ({
        code: r.code,
        rule: r.rule,
        message: r.message,
      })),
    };
  }
}
