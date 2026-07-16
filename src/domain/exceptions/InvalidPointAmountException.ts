import { DomainException } from "./DomainException";

export class InvalidPointAmountException extends DomainException {
  constructor(field: string, rawValue: string) {
    super(`${field} invalido: "${rawValue}". Debe ser un entero no negativo`);
  }
}
