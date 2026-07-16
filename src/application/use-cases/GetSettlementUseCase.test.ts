/** Tests de la consulta de liquidacion (RF-04): validacion de entrada, 404 de aliado y delegacion al calculo. */

import { describe, expect, it } from "vitest";
import { buildTransaction } from "../../test-support/buildTransaction";
import {
  FakePartnerRepository,
  InMemoryTransactionRepository,
} from "../../test-support/fakes";
import { SettlementCalculator } from "../services/SettlementCalculator";
import { GetSettlementUseCase } from "./GetSettlementUseCase";

const partnerRepository = new FakePartnerRepository([
  { partnerId: "PART01", partnerName: "Cafe Central" },
]);

function buildUseCase(seed = new InMemoryTransactionRepository()) {
  return new GetSettlementUseCase({
    transactionRepository: seed,
    partnerRepository,
    settlementCalculator: new SettlementCalculator(),
  });
}

describe("GetSettlementUseCase", () => {
  it("devuelve el agregado con daily_breakdown completo (dias sin actividad en cero)", async () => {
    const repo = new InMemoryTransactionRepository([
      buildTransaction({
        id: "T1",
        member: "MEM001",
        earned: 100,
        date: "2026-07-01",
      }),
      buildTransaction({
        id: "T2",
        member: "MEM002",
        earned: 50,
        redeemed: 20,
        date: "2026-07-01",
      }),
      buildTransaction({
        id: "T3",
        member: "MEM001",
        earned: 30,
        date: "2026-07-03",
      }),
    ]);
    const result = await buildUseCase(repo).execute({
      partnerId: "PART01",
      from: "2026-07-01",
      to: "2026-07-03",
    });

    expect(result.outcome).toBe("ok");
    if (result.outcome !== "ok") throw new Error("unreachable");
    expect(result.settlement.totalTransactions).toBe(3);
    expect(result.settlement.rawNetPoints).toBe(160);
    expect(result.settlement.uniqueMembers).toBe(2);
    expect(result.settlement.dailyBreakdown).toHaveLength(3);
    expect(result.settlement.dailyBreakdown[1]).toMatchObject({
      date: "2026-07-02",
      transactions: 0,
    });
  });

  it("conserva el neto crudo negativo en el agregado (RF-04: el wire lo reporta 0)", async () => {
    const repo = new InMemoryTransactionRepository([
      buildTransaction({
        id: "T1",
        earned: 10,
        redeemed: 100,
        date: "2026-07-01",
      }),
    ]);
    const result = await buildUseCase(repo).execute({
      partnerId: "PART01",
      from: "2026-07-01",
      to: "2026-07-01",
    });
    if (result.outcome !== "ok") throw new Error("unreachable");
    expect(result.settlement.rawNetPoints).toBe(-90);
  });

  it("devuelve partner_not_found si el aliado no existe", async () => {
    const result = await buildUseCase().execute({
      partnerId: "PART99",
      from: "2026-07-01",
      to: "2026-07-02",
    });
    expect(result.outcome).toBe("partner_not_found");
  });

  it("devuelve invalid_input ante partner_id con formato invalido", async () => {
    const result = await buildUseCase().execute({
      partnerId: "XYZ",
      from: "2026-07-01",
      to: "2026-07-02",
    });
    expect(result.outcome).toBe("invalid_input");
  });

  it("devuelve invalid_input ante fechas invalidas o from > to", async () => {
    const badDate = await buildUseCase().execute({
      partnerId: "PART01",
      from: "01/07/2026",
      to: "2026-07-02",
    });
    expect(badDate.outcome).toBe("invalid_input");

    const inverted = await buildUseCase().execute({
      partnerId: "PART01",
      from: "2026-07-10",
      to: "2026-07-01",
    });
    expect(inverted.outcome).toBe("invalid_input");
  });
});
