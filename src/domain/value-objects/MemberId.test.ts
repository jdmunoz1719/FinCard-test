/** Tests del VO MemberId: invariante MEM + 3 digitos (RF-01). */

import { describe, expect, it } from "vitest";
import { InvalidMemberIdException } from "../exceptions/InvalidMemberIdException";
import { MemberId } from "./MemberId";

describe("MemberId", () => {
  it("acepta el formato MEM + 3 digitos", () => {
    expect(MemberId.create("MEM001").value).toBe("MEM001");
  });

  it("rechaza prefijo incorrecto con la excepcion especifica", () => {
    expect(() => MemberId.create("XYZ001")).toThrow(InvalidMemberIdException);
  });

  it("rechaza cantidad de digitos incorrecta", () => {
    expect(MemberId.isValid("MEM01")).toBe(false);
    expect(MemberId.isValid("MEM0001")).toBe(false);
  });

  it("equals compara por valor, no por referencia", () => {
    expect(MemberId.create("MEM001").equals(MemberId.create("MEM001"))).toBe(
      true,
    );
    expect(MemberId.create("MEM001").equals(MemberId.create("MEM002"))).toBe(
      false,
    );
  });
});
