/** Tests del VO PartnerId: invariante PART + 2 digitos (RF-01). */

import { describe, expect, it } from "vitest";
import { InvalidPartnerIdException } from "../exceptions/InvalidPartnerIdException";
import { PartnerId } from "./PartnerId";

describe("PartnerId", () => {
  it("acepta el formato PART + 2 digitos", () => {
    expect(PartnerId.create("PART01").value).toBe("PART01");
  });

  it("rechaza formatos incorrectos con la excepcion especifica", () => {
    expect(PartnerId.isValid("PART1")).toBe(false);
    expect(PartnerId.isValid("PARTNER01")).toBe(false);
    expect(() => PartnerId.create("PART1")).toThrow(InvalidPartnerIdException);
  });
});
