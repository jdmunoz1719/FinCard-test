import { RowValidationError } from "../entities/ProcessingManifest";
import { Transaction } from "../entities/Transaction";
import { ParsedCsv } from "./ICsvParser";

export interface DataQualityResult {
  transactions: Transaction[];
  errors: RowValidationError[];
}

/**
 * Puerto de validacion por fila (RF-01): convierte filas crudas en
 * entidades, acumulando errores en vez de cortar en la primera — asi el
 * procesamiento parcial puede seguir con las filas validas.
 */
export interface IDataQualityValidator {
  validate(parsed: ParsedCsv): DataQualityResult;
}
