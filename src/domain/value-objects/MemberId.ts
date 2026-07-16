import { InvalidMemberIdException } from "../exceptions/InvalidMemberIdException";

/** Identificador de miembro: MEM + 3 digitos (RF-01). Inmutable, se compara por valor. */
export class MemberId {
  private static readonly PATTERN = /^MEM\d{3}$/;

  private constructor(public readonly value: string) {}

  /** Valida sin lanzar: la usa el validador CSV para acumular errores por fila. */
  public static isValid(raw: string): boolean {
    return MemberId.PATTERN.test(raw);
  }

  public static create(raw: string): MemberId {
    if (!MemberId.isValid(raw)) {
      throw new InvalidMemberIdException(raw);
    }
    return new MemberId(raw);
  }

  public equals(other: MemberId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
