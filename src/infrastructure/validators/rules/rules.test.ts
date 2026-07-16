/** Tests de cada regla-estrategia RN-01..RN-04 de forma aislada. El reloj de RN-04 se congela con FixedDateProvider. */

import { describe, expect, it } from "vitest";
import { buildTransaction as tx } from "../../../test-support/buildTransaction";
import { FixedDateProvider } from "../../../test-support/fakes";
import { DailyPointsThresholdRule } from "./DailyPointsThresholdRule";
import { DateRangeRule } from "./DateRangeRule";
import { MemberDailyTransactionLimitRule } from "./MemberDailyTransactionLimitRule";
import { RedemptionRatioRule } from "./RedemptionRatioRule";

const NOW = new Date("2026-07-14T00:00:00Z");

describe("DailyPointsThresholdRule (RN-01)", () => {
  const rule = new DailyPointsThresholdRule();

  it("flaguea solo las transacciones que llegan DESPUES de cruzar los 10,000 netos", () => {
    const flags = rule.evaluate([
      tx({ id: "T1", member: "MEM001", earned: 6000, date: "2026-07-01" }),
      tx({ id: "T2", member: "MEM001", earned: 5000, date: "2026-07-01" }), // cruza el umbral
      tx({ id: "T3", member: "MEM001", earned: 100, date: "2026-07-01" }), // adicional -> flag
    ]);
    expect(flags.has("T1")).toBe(false);
    expect(flags.has("T2")).toBe(false);
    expect(flags.get("T3")![0]!.rule).toBe("RN-01");
  });

  it("no cruza acumulados entre miembros distintos ni dias distintos", () => {
    const flags = rule.evaluate([
      tx({ id: "T1", member: "MEM001", earned: 11000, date: "2026-07-01" }),
      tx({ id: "T2", member: "MEM002", earned: 100, date: "2026-07-01" }), // otro miembro
      tx({ id: "T3", member: "MEM001", earned: 100, date: "2026-07-02" }), // otro dia
    ]);
    expect(flags.size).toBe(0);
  });
});

describe("RedemptionRatioRule (RN-02)", () => {
  const rule = new RedemptionRatioRule();

  it("flaguea TODAS las transacciones con redemption cuando el ratio del dia supera 30%", () => {
    const flags = rule.evaluate([
      tx({ id: "T1", member: "MEM001", earned: 100, date: "2026-07-01" }),
      tx({
        id: "T2",
        member: "MEM002",
        earned: 0,
        redeemed: 50,
        date: "2026-07-01",
      }),
      tx({
        id: "T3",
        member: "MEM003",
        earned: 0,
        redeemed: 50,
        date: "2026-07-01",
      }),
    ]); // 2/3 = 66% > 30%
    expect(flags.has("T1")).toBe(false);
    expect(flags.get("T2")![0]!.rule).toBe("RN-02");
    expect(flags.get("T3")![0]!.rule).toBe("RN-02");
  });

  it("no flaguea cuando la proporcion queda dentro del limite", () => {
    const flags = rule.evaluate([
      tx({ id: "T1", member: "MEM001", earned: 100, date: "2026-07-01" }),
      tx({ id: "T2", member: "MEM002", earned: 100, date: "2026-07-01" }),
      tx({ id: "T3", member: "MEM003", earned: 100, date: "2026-07-01" }),
      tx({
        id: "T4",
        member: "MEM004",
        earned: 0,
        redeemed: 50,
        date: "2026-07-01",
      }),
    ]); // 1/4 = 25% <= 30%
    expect(flags.size).toBe(0);
  });
});

describe("MemberDailyTransactionLimitRule (RN-03)", () => {
  const rule = new MemberDailyTransactionLimitRule();

  it("flaguea desde la 6ta transaccion del mismo miembro+aliado+dia", () => {
    const txns = Array.from({ length: 7 }, (_, i) =>
      tx({
        id: `T${i + 1}`,
        member: "MEM001",
        partner: "PART01",
        earned: 10,
        date: "2026-07-01",
      }),
    );
    const flags = rule.evaluate(txns);
    expect(flags.has("T5")).toBe(false);
    expect(flags.get("T6")![0]!.rule).toBe("RN-03");
    expect(flags.get("T7")![0]!.rule).toBe("RN-03");
  });

  it("no cuenta transacciones del mismo miembro con OTRO aliado", () => {
    const txns = [
      ...Array.from({ length: 5 }, (_, i) =>
        tx({
          id: `A${i + 1}`,
          member: "MEM001",
          partner: "PART01",
          earned: 10,
          date: "2026-07-01",
        }),
      ),
      tx({
        id: "B1",
        member: "MEM001",
        partner: "PART02",
        earned: 10,
        date: "2026-07-01",
      }),
    ];
    expect(rule.evaluate(txns).size).toBe(0);
  });
});

describe("DateRangeRule (RN-04)", () => {
  const rule = new DateRangeRule(new FixedDateProvider(NOW));

  it("flaguea fecha futura", () => {
    const flags = rule.evaluate([tx({ id: "T1", date: "2026-07-15" })]);
    expect(flags.get("T1")![0]!.code).toBe("DATE_OUT_OF_RANGE");
    expect(flags.get("T1")![0]!.message).toMatch(/futura/);
  });

  it("flaguea fecha con mas de 2 anios de antiguedad", () => {
    const flags = rule.evaluate([tx({ id: "T1", date: "2023-01-01" })]);
    expect(flags.get("T1")![0]!.message).toMatch(/antiguedad/);
  });

  it("acepta fechas dentro de la ventana", () => {
    const flags = rule.evaluate([tx({ id: "T1", date: "2026-07-14" })]);
    expect(flags.size).toBe(0);
  });
});
