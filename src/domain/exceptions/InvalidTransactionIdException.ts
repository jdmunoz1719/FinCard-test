import { DomainException } from "./DomainException";

export class InvalidTransactionIdException extends DomainException {
  constructor() {
    super("transaction_id no puede estar vacio");
  }
}
