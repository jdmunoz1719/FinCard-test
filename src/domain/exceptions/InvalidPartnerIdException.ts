import { DomainException } from "./DomainException";

export class InvalidPartnerIdException extends DomainException {
  constructor(rawValue: string) {
    super(
      `partner_id invalido: "${rawValue}". Formato esperado PART + 2 digitos (ej. PART01)`,
    );
  }
}
