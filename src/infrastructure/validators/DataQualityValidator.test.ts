/** Tests del validador de calidad por fila (RF-01): validacion de campos, duplicados, error-de-fila vs estructural. */

import { describe, expect, it } from "vitest";
import { InvalidCsvFormatException } from "../../domain/exceptions/InvalidCsvFormatException";
import { CsvParser } from "../csv/CsvParser";
import { DataQualityValidator } from "./DataQualityValidator";

const HEADER =
  "transaction_id,member_id,partner_id,points_earned,points_redeemed,transaction_date,partner_name";
const parser = new CsvParser();
const validator = new DataQualityValidator();

function validate(csv: string) {
  return validator.validate(parser.parse(csv));
}

describe("DataQualityValidator", () => {
  it("convierte filas validas en entidades Transaction", () => {
    const { transactions, errors } = validate(
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central`,
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.transactionId.value).toBe("TXN001");
  });

  it("lanza InvalidCsvFormatException si faltan columnas (error ESTRUCTURAL, no de fila)", () => {
    expect(() => validate("transaction_id,member_id\nTXN001,MEM001")).toThrow(
      InvalidCsvFormatException,
    );
  });

  it("acepta columnas en cualquier orden", () => {
    const { transactions, errors } = validate(
      "partner_name,transaction_id,member_id,partner_id,points_earned,points_redeemed,transaction_date\n" +
        "Cafe Central,TXN001,MEM001,PART01,150,0,2026-07-01",
    );
    expect(errors).toHaveLength(0);
    expect(transactions).toHaveLength(1);
  });

  it("reporta la COLUMNA exacta que fallo en cada error", () => {
    const { errors } = validate(
      `${HEADER}\nTXN001,XYZ001,PART01,150,0,2026-07-01,Cafe Central`,
    );
    expect(errors[0]).toMatchObject({ row: 1, column: "member_id" });
  });

  it("una fila con varios campos invalidos genera un error por columna", () => {
    const { errors } = validate(
      `${HEADER}\nTXN001,XYZ001,PARTNER1,-10,0,2026-07-01,Cafe Central`,
    );
    const columns = errors.map((e) => e.column).sort();
    expect(columns).toEqual(["member_id", "partner_id", "points_earned"]);
  });

  it("detecta transaction_id duplicado dentro del archivo (procesa la primera aparicion)", () => {
    const { transactions, errors } = validate(
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN001,MEM002,PART02,80,0,2026-07-01,Gasolinera Express`,
    );
    expect(transactions).toHaveLength(1);
    expect(errors[0]).toMatchObject({ row: 2, column: "transaction_id" });
  });

  it("PROCESAMIENTO PARCIAL: las filas validas sobreviven aunque otras fallen", () => {
    const { transactions, errors } = validate(
      `${HEADER}\nTXN001,MEM001,PART01,150,0,2026-07-01,Cafe Central\nTXN002,BAD,PART02,80,0,2026-07-01,Gasolinera Express\nTXN003,MEM003,PART03,60,0,2026-07-02,Tienda Moda`,
    );
    expect(transactions.map((t) => t.transactionId.value)).toEqual([
      "TXN001",
      "TXN003",
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.row).toBe(2);
  });

  it("reporta fila incompleta con columna '*'", () => {
    const { errors } = validate(`${HEADER}\nTXN001,MEM001,PART01`);
    expect(errors[0]).toMatchObject({ row: 1, column: "*" });
  });

  it("rechaza points_earned negativo y fecha con formato invalido", () => {
    const { errors } = validate(
      `${HEADER}\nTXN001,MEM001,PART01,-10,0,2026-07-01,Cafe Central\nTXN002,MEM002,PART02,10,0,01/07/2026,Gasolinera Express`,
    );
    expect(errors.find((e) => e.row === 1)!.column).toBe("points_earned");
    expect(errors.find((e) => e.row === 2)!.column).toBe("transaction_date");
  });
});
