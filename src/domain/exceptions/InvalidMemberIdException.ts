import { DomainException } from "./DomainException";

export class InvalidMemberIdException extends DomainException {
  constructor(rawValue: string) {
    super(
      `member_id invalido: "${rawValue}". Formato esperado MEM + 3 digitos (ej. MEM001)`,
    );
  }
}
