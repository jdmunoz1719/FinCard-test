/** Tests del parser CSV: casos simples y el subconjunto RFC 4180 soportado (comillas, comas embebidas). */

import { describe, expect, it } from "vitest";
import { CsvParser } from "./CsvParser";

describe("CsvParser", () => {
  const parser = new CsvParser();

  it("parsea header y filas simples", () => {
    const result = parser.parse("a,b,c\n1,2,3\n4,5,6");
    expect(result.header).toEqual(["a", "b", "c"]);
    expect(result.rows).toEqual([
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
  });

  it("ignora lineas vacias (incluida la ultima con salto final)", () => {
    expect(parser.parse("a,b\n1,2\n\n3,4\n").rows).toHaveLength(2);
  });

  it("soporta campos entre comillas con comas embebidas", () => {
    expect(parser.parse('a,b\n"Cafe, Central",2').rows[0]).toEqual([
      "Cafe, Central",
      "2",
    ]);
  });

  it('soporta comillas escapadas ("") dentro de un campo entre comillas', () => {
    expect(parser.parse('a,b\n"Tienda ""Moda""",2').rows[0]).toEqual([
      'Tienda "Moda"',
      "2",
    ]);
  });

  it("devuelve estructura vacia para contenido vacio", () => {
    expect(parser.parse("")).toEqual({ header: [], rows: [] });
  });
});
