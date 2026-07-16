/** Tests del VO TransactionDate: formato YYYY-MM-DD, fechas calendario reales y predicados que usa RN-04. */

import { describe, expect, it } from "vitest";
import { InvalidTransactionDateException } from "../exceptions/InvalidTransactionDateException";
import { TransactionDate } from "./TransactionDate";

describe("TransactionDate", () => {
  it("acepta fecha valida YYYY-MM-DD", () => {
    expect(TransactionDate.create("2026-07-01").toString()).toBe("2026-07-01");
  });

  it("rechaza formatos incorrectos con la excepcion especifica", () => {
    expect(TransactionDate.isValid("01-07-2026")).toBe(false);
    expect(TransactionDate.isValid("2026/07/01")).toBe(false);
    expect(() => TransactionDate.create("01-07-2026")).toThrow(
      InvalidTransactionDateException,
    );
  });

  it("rechaza fechas calendario inexistentes (30 de febrero)", () => {
    expect(TransactionDate.isValid("2026-02-30")).toBe(false);
  });

  it("isFutureRelativeTo detecta fecha futura respecto a un 'ahora' inyectado", () => {
    const now = new Date("2026-07-14T00:00:00Z");
    expect(TransactionDate.create("2026-07-15").isFutureRelativeTo(now)).toBe(
      true,
    );
    expect(TransactionDate.create("2026-07-13").isFutureRelativeTo(now)).toBe(
      false,
    );
  });

  it("isOlderThanYears detecta fecha fuera de la ventana de 2 anios (RN-04)", () => {
    const now = new Date("2026-07-14T00:00:00Z");
    expect(TransactionDate.create("2024-01-01").isOlderThanYears(2, now)).toBe(
      true,
    );
    expect(TransactionDate.create("2025-01-01").isOlderThanYears(2, now)).toBe(
      false,
    );
  });
});
