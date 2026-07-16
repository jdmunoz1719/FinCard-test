import { InvalidPartnerIdException } from "../exceptions/InvalidPartnerIdException";

/** Identificador de aliado comercial: PART + 2 digitos (RF-01). Inmutable, se compara por valor. */
export class PartnerId {
  private static readonly PATTERN = /^PART\d{2}$/;

  private constructor(public readonly value: string) {}

  public static isValid(raw: string): boolean {
    return PartnerId.PATTERN.test(raw);
  }

  public static create(raw: string): PartnerId {
    if (!PartnerId.isValid(raw)) {
      throw new InvalidPartnerIdException(raw);
    }
    return new PartnerId(raw);
  }

  public equals(other: PartnerId): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }
}
