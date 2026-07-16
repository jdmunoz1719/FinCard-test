/** Tests del compositor de reglas: particion valid/flagged, fusion de motivos, extensibilidad (OCP). */

import { describe, expect, it } from "vitest";
import { buildTransaction as tx } from "../../test-support/buildTransaction";
import { FixedDateProvider } from "../../test-support/fakes";
import { BusinessRulesValidator } from "./BusinessRulesValidator";
import { DailyPointsThresholdRule } from "./rules/DailyPointsThresholdRule";
import { DateRangeRule } from "./rules/DateRangeRule";
import { MemberDailyTransactionLimitRule } from "./rules/MemberDailyTransactionLimitRule";
import { RedemptionRatioRule } from "./rules/RedemptionRatioRule";

const NOW = new Date("2026-07-14T00:00:00Z");

function buildValidator(): BusinessRulesValidator {
  return new BusinessRulesValidator([
    new DailyPointsThresholdRule(),
    new RedemptionRatioRule(),
    new MemberDailyTransactionLimitRule(),
    new DateRangeRule(new FixedDateProvider(NOW)),
  ]);
}

describe("BusinessRulesValidator", () => {
  it("no flaguea transacciones que cumplen todas las reglas", () => {
    const { valid, flagged } = buildValidator().evaluate([
      tx({ id: "T1", earned: 100, date: "2026-07-01" }),
    ]);
    expect(valid).toHaveLength(1);
    expect(flagged).toHaveLength(0);
  });

  it("particiona el batch preservando el orden original del archivo", () => {
    const { valid, flagged } = buildValidator().evaluate([
      tx({ id: "T1", member: "MEM001", earned: 11000, date: "2026-07-01" }),
      tx({ id: "T2", member: "MEM001", earned: 100, date: "2026-07-01" }), // RN-01: adicional
      tx({ id: "T3", member: "MEM002", earned: 50, date: "2026-07-01" }),
    ]);
    expect(valid.map((t) => t.transactionId.value)).toEqual(["T1", "T3"]);
    expect(flagged.map((f) => f.transaction.transactionId.value)).toEqual([
      "T2",
    ]);
  });

  it("una transaccion acumula motivos de VARIAS reglas a la vez", () => {
    // T2 viola RN-01 (adicional tras 10k del mismo miembro/dia con fecha futura)
    // y RN-04 (fecha futura). Ambos motivos deben quedar registrados.
    const { flagged } = buildValidator().evaluate([
      tx({ id: "T1", member: "MEM001", earned: 11000, date: "2030-01-01" }),
      tx({ id: "T2", member: "MEM001", earned: 100, date: "2030-01-01" }),
    ]);
    const t2 = flagged.find((f) => f.transaction.transactionId.value === "T2")!;
    const rules = t2.reasons.map((r) => r.rule).sort();
    expect(rules).toEqual(["RN-01", "RN-04"]);
  });

  it("OCP: con un subconjunto de reglas, las demas no aplican", () => {
    // Solo RN-04: el exceso de puntos (RN-01) ya no flaguea.
    const onlyDateRule = new BusinessRulesValidator([
      new DateRangeRule(new FixedDateProvider(NOW)),
    ]);
    const { valid, flagged } = onlyDateRule.evaluate([
      tx({ id: "T1", member: "MEM001", earned: 11000, date: "2026-07-01" }),
      tx({ id: "T2", member: "MEM001", earned: 100, date: "2026-07-01" }),
    ]);
    expect(valid).toHaveLength(2);
    expect(flagged).toHaveLength(0);
  });
});
