/** Tests del VO TransactionId: unico invariante es "no vacio" (RF-01). */

import { describe, expect, it } from "vitest";
import { InvalidTransactionIdException } from "../exceptions/InvalidTransactionIdException";
import { TransactionId } from "./TransactionId";

describe("TransactionId", () => {
  it("acepta cualquier string no vacio, sin exigir un formato fijo", () => {
    expect(TransactionId.create("TXN001").value).toBe("TXN001");
    expect(TransactionId.create("cualquier-cosa-123").value).toBe(
      "cualquier-cosa-123",
    );
  });

  it("rechaza vacio o solo espacios con la excepcion especifica", () => {
    expect(TransactionId.isValid("")).toBe(false);
    expect(TransactionId.isValid("   ")).toBe(false);
    expect(() => TransactionId.create("")).toThrow(
      InvalidTransactionIdException,
    );
  });

  it("equals compara por valor, no por referencia", () => {
    expect(
      TransactionId.create("TXN001").equals(TransactionId.create("TXN001")),
    ).toBe(true);
    expect(
      TransactionId.create("TXN001").equals(TransactionId.create("TXN002")),
    ).toBe(false);
  });
});
