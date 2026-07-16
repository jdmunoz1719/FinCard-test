/**
 * Motivo por el que una transaccion queda "sujeta a revision" (RF-05):
 * codigo estable (para filtrar/agrupar), regla de origen (RN-01..04) y
 * mensaje legible. Catalogo cerrado a proposito — solo se crea desde las
 * factories de abajo, no se inventan motivos sueltos en otro lado.
 */
export type FlagReasonCode =
  | "DAILY_POINTS_EXCEEDED"
  | "REDEMPTION_RATIO_EXCEEDED"
  | "MEMBER_DAILY_LIMIT_EXCEEDED"
  | "DATE_OUT_OF_RANGE";

export class FlagReason {
  private constructor(
    public readonly code: FlagReasonCode,
    public readonly rule: string,
    public readonly message: string,
  ) {}

  public static dailyPointsExceeded(): FlagReason {
    return new FlagReason(
      "DAILY_POINTS_EXCEEDED",
      "RN-01",
      "El miembro excede 10,000 puntos netos acumulados en el dia",
    );
  }

  public static redemptionRatioExceeded(): FlagReason {
    return new FlagReason(
      "REDEMPTION_RATIO_EXCEEDED",
      "RN-02",
      "El aliado excede el 30% de transacciones diarias con points_redeemed > 0 (posible fraude)",
    );
  }

  public static memberDailyLimitExceeded(): FlagReason {
    return new FlagReason(
      "MEMBER_DAILY_LIMIT_EXCEEDED",
      "RN-03",
      "El miembro excede 5 transacciones el mismo dia con el mismo aliado",
    );
  }

  public static dateOutOfRange(detail: string): FlagReason {
    return new FlagReason("DATE_OUT_OF_RANGE", "RN-04", detail);
  }

  /** Reconstruye un motivo ya persistido (lee de vuelta desde el archivo). */
  public static fromPersistence(
    code: FlagReasonCode,
    rule: string,
    message: string,
  ): FlagReason {
    return new FlagReason(code, rule, message);
  }

  public equals(other: FlagReason): boolean {
    return this.code === other.code;
  }
}
