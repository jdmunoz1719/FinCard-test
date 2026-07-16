/** Tests del tipo Result: ramas ok/fail y proteccion contra lecturas invalidas. */

import { describe, expect, it } from "vitest";
import { Result } from "./Result";

describe("Result", () => {
  it("un Result.ok expone el valor y reporta isOk", () => {
    const result = Result.ok(42);
    expect(result.isOk).toBe(true);
    expect(result.isFail).toBe(false);
    expect(result.value).toBe(42);
  });

  it("un Result.fail expone el error y reporta isFail", () => {
    const result = Result.fail<number>(new Error("fallo de disco"));
    expect(result.isFail).toBe(true);
    expect(result.error.message).toBe("fallo de disco");
  });

  it("leer value de un fail lanza (bug del consumidor, no silencioso)", () => {
    const result = Result.fail<number>(new Error("x"));
    expect(() => result.value).toThrow(/Result fallido/);
  });

  it("leer error de un ok lanza", () => {
    const result = Result.ok(1);
    expect(() => result.error).toThrow(/Result exitoso/);
  });

  it("Result.ok() sin valor funciona para operaciones void", () => {
    const result = Result.ok();
    expect(result.isOk).toBe(true);
  });
});
