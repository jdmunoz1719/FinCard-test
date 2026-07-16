import { InvalidTransactionIdException } from "../exceptions/InvalidTransactionIdException";

/**
 * Identificador de transaccion. El enunciado no impone un formato (los
 * ejemplos usan TXN + digitos, pero no es obligatorio) — el unico invariante
 * es "no vacio". La unicidad DENTRO del archivo la revisa DataQualityValidator,
 * que ve todas las filas a la vez; un VO individual no puede saber eso.
 */
export class TransactionId {
  private constructor(public readonly value: string) {}

  public static isValid(raw: string): boolean {
    return raw.trim().length > 0;
  }

  public static create(raw: string): TransactionId {
    if (!TransactionId.isValid(raw)) {
      throw new InvalidTransactionIdException();
    }
    return new TransactionId(raw);
  }

  public equals(other: TransactionId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
