import { DomainException } from "./DomainException";

/** Error ESTRUCTURAL del archivo (columnas faltantes, vacio) — a diferencia de
 *  un error de fila, este rechaza el archivo completo con 400. */
export class InvalidCsvFormatException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
