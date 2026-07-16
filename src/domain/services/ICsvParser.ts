export interface ParsedCsv {
  header: string[];
  rows: string[][];
}

/** Puerto de parseo CSV: convierte texto en header+filas, sin validar nada de negocio. */
export interface ICsvParser {
  parse(content: string): ParsedCsv;
}
