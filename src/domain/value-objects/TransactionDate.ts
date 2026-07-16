import { InvalidTransactionDateException } from "../exceptions/InvalidTransactionDateException";

/**
 * Fecha de transaccion: formato YYYY-MM-DD y fecha calendario real (RF-01).
 * Los predicados temporales (isFutureRelativeTo, isOlderThanYears) reciben
 * el "ahora" como parametro en vez de usar new Date() internamente, para
 * que RN-04 sea determinista y facil de testear con una fecha fija.
 */
export class TransactionDate {
  private static readonly FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/;

  private constructor(
    public readonly isoString: string,
    private readonly date: Date,
  ) {}

  public static isValid(raw: string): boolean {
    const match = TransactionDate.FORMAT.exec(raw.trim());
    if (!match) return false;
    const [, yearStr, monthStr, dayStr] = match;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    // Date.UTC "normaliza" fechas invalidas (30 feb -> 2 mar); si algun
    // componente cambio tras construir, la fecha original no existia.
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  public static create(raw: string): TransactionDate {
    const trimmed = raw.trim();
    if (!TransactionDate.isValid(trimmed)) {
      throw new InvalidTransactionDateException(raw);
    }
    const [, yearStr, monthStr, dayStr] = TransactionDate.FORMAT.exec(trimmed)!;
    const date = new Date(
      Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)),
    );
    return new TransactionDate(trimmed, date);
  }

  public isAfter(other: TransactionDate): boolean {
    return this.date.getTime() > other.date.getTime();
  }

  public isBefore(other: TransactionDate): boolean {
    return this.date.getTime() < other.date.getTime();
  }

  /** RN-04: la fecha es posterior a `now`. */
  public isFutureRelativeTo(now: Date): boolean {
    return this.date.getTime() > now.getTime();
  }

  /** RN-04: la fecha es anterior a (`now` - `years` anios). */
  public isOlderThanYears(years: number, now: Date): boolean {
    const cutoff = new Date(now);
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
    return this.date.getTime() < cutoff.getTime();
  }

  public toString(): string {
    return this.isoString;
  }
}
