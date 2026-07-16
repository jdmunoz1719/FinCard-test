import { ICsvParser, ParsedCsv } from "../../domain/services/ICsvParser";

/**
 * Parser CSV propio (subconjunto de RFC 4180: comillas, comillas escapadas "",
 * comas embebidas). Solo convierte texto en {header, rows}; no valida negocio.
 */
export class CsvParser implements ICsvParser {
  public parse(content: string): ParsedCsv {
    const lines = content
      .split(/\r\n|\n/)
      .filter((line) => line.trim().length > 0);
    if (lines.length === 0) return { header: [], rows: [] };

    const [headerLine, ...dataLines] = lines;
    const header = this.parseLine(headerLine!).map((h) => h.trim());
    const rows = dataLines.map((line) => this.parseLine(line));
    return { header, rows };
  }

  /** Parsea UNA linea respetando comillas (RFC 4180: "" escapa una comilla). */
  private parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"';
            i++; // consume la comilla escapada
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
