/** Tests del VO PointAmount: invariante "entero >= 0" (RF-01) y operaciones inmutables. */

import { describe, expect, it } from "vitest";
import { InvalidPointAmountException } from "../exceptions/InvalidPointAmountException";
import { PointAmount } from "./PointAmount";

describe("PointAmount", () => {
  it("acepta enteros no negativos", () => {
    expect(PointAmount.create("0", "points_earned").value).toBe(0);
    expect(PointAmount.create("150", "points_earned").value).toBe(150);
  });

  it("rechaza negativos con la excepcion especifica del dominio", () => {
    expect(PointAmount.isValid("-5")).toBe(false);
    expect(() => PointAmount.create("-5", "points_earned")).toThrow(
      InvalidPointAmountException,
    );
  });

  it("rechaza decimales, texto y vacio", () => {
    expect(PointAmount.isValid("1.5")).toBe(false);
    expect(PointAmount.isValid("abc")).toBe(false);
    expect(PointAmount.isValid("")).toBe(false);
  });

  it("add es inmutable: devuelve instancia nueva sin mutar las originales", () => {
    const a = PointAmount.create("100", "points_earned");
    const b = PointAmount.create("50", "points_earned");
    const sum = a.add(b);
    expect(sum.value).toBe(150);
    expect(a.value).toBe(100); // sin mutacion
  });

  it("subtract devuelve number crudo (el neto SI puede ser negativo)", () => {
    const earned = PointAmount.create("100", "points_earned");
    const redeemed = PointAmount.create("150", "points_redeemed");
    expect(earned.subtract(redeemed)).toBe(-50);
  });
});
