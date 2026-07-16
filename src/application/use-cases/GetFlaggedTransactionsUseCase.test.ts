/** Tests del listado de transacciones "sujetas a revision" (RF-05): listado, filtro por aliado, validacion. */

import { describe, expect, it } from "vitest";
import { FlaggedTransaction } from "../../domain/entities/FlaggedTransaction";
import { FlagReason } from "../../domain/value-objects/FlagReason";
import { buildTransaction } from "../../test-support/buildTransaction";
import { InMemoryFlaggedRepository } from "../../test-support/fakes";
import { GetFlaggedTransactionsUseCase } from "./GetFlaggedTransactionsUseCase";

async function seedRepository(): Promise<InMemoryFlaggedRepository> {
  const repo = new InMemoryFlaggedRepository();
  await repo.saveBatch(
    [
      FlaggedTransaction.create(
        buildTransaction({ id: "T1", partner: "PART01" }),
        [FlagReason.dailyPointsExceeded()],
      ),
      FlaggedTransaction.create(
        buildTransaction({ id: "T2", partner: "PART02" }),
        [FlagReason.dateOutOfRange("fecha futura")],
      ),
    ],
    { batchId: "batch-1", processedAt: new Date("2026-07-14T00:00:00Z") },
  );
  return repo;
}

describe("GetFlaggedTransactionsUseCase", () => {
  it("lista todas las flaggeadas con sus motivos y metadatos de batch", async () => {
    const useCase = new GetFlaggedTransactionsUseCase({
      flaggedTransactionRepository: await seedRepository(),
    });
    const result = await useCase.execute({});

    expect(result.outcome).toBe("ok");
    if (result.outcome !== "ok") throw new Error("unreachable");
    expect(result.flagged).toHaveLength(2);
    expect(result.flagged[0]!.batchId).toBe("batch-1");
    expect(result.flagged[0]!.flagged.reasons[0]!.code).toBe(
      "DAILY_POINTS_EXCEEDED",
    );
  });

  it("filtra por partner_id cuando se envia", async () => {
    const useCase = new GetFlaggedTransactionsUseCase({
      flaggedTransactionRepository: await seedRepository(),
    });
    const result = await useCase.execute({ partnerId: "PART02" });

    if (result.outcome !== "ok") throw new Error("unreachable");
    expect(result.flagged).toHaveLength(1);
    expect(result.flagged[0]!.flagged.transaction.transactionId.value).toBe(
      "T2",
    );
  });

  it("devuelve invalid_input ante partner_id con formato invalido", async () => {
    const useCase = new GetFlaggedTransactionsUseCase({
      flaggedTransactionRepository: new InMemoryFlaggedRepository(),
    });
    const result = await useCase.execute({ partnerId: "NOPE" });
    expect(result.outcome).toBe("invalid_input");
  });
});
