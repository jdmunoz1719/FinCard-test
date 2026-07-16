import { DomainException } from "./DomainException";

/** Solo por formato/fecha calendario invalida. La ventana temporal (no futura,
 *  no > 2 anios) es RN-04 y marca la fila como flagged, no rechaza. */
export class InvalidTransactionDateException extends DomainException {
  constructor(rawValue: string) {
    super(
      `transaction_date invalida: "${rawValue}". Formato esperado YYYY-MM-DD`,
    );
  }
}
