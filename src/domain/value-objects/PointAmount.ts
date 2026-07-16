import { InvalidPointAmountException } from "../exceptions/InvalidPointAmountException";

/** Cantidad de puntos (earned o redeemed): entero >= 0, inmutable (RF-01). */
export class PointAmount {
  private constructor(public readonly value: number) {}

  /** Valida el string crudo del CSV sin lanzar (solo digitos => entero no negativo). */
  public static isValid(raw: string): boolean {
    return /^\d+$/.test(raw.trim()) && Number.isInteger(Number(raw));
  }

  public static create(raw: string, field: string): PointAmount {
    if (!PointAmount.isValid(raw)) {
      throw new InvalidPointAmountException(field, raw);
    }
    return new PointAmount(Number(raw));
  }

  public static zero(): PointAmount {
    return new PointAmount(0);
  }

  public add(other: PointAmount): PointAmount {
    return new PointAmount(this.value + other.value);
  }

  /**
   * Resta cruda (earned - redeemed). Devuelve number, no PointAmount: el
   * neto SI puede ser negativo (el aliado le debe puntos al miembro), y
   * PointAmount no puede representar eso por su invariante >= 0.
   */
  public subtract(other: PointAmount): number {
    return this.value - other.value;
  }
}
