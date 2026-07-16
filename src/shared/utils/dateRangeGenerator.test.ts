/** Tests del generador de rangos de fechas que alimenta el daily_breakdown de RF-04. */

import { describe, expect, it } from "vitest";
import { generateIsoDateRange } from "./dateRangeGenerator";

describe("generateIsoDateRange", () => {
  it("enumera un rango simple inclusive en ambos extremos", () => {
    expect(generateIsoDateRange("2026-07-01", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("devuelve un solo dia si from === to", () => {
    expect(generateIsoDateRange("2026-07-01", "2026-07-01")).toEqual([
      "2026-07-01",
    ]);
  });

  it("cruza fin de mes correctamente", () => {
    expect(generateIsoDateRange("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("devuelve vacio si from > to", () => {
    expect(generateIsoDateRange("2026-07-10", "2026-07-01")).toEqual([]);
  });
});
