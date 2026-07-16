/** Tests del mapper de flaggeadas (RF-05): shape wire con motivos (codigo + regla + mensaje). */

import { describe, expect, it } from "vitest";
import { FlaggedTransaction } from "../../domain/entities/FlaggedTransaction";
import { PersistedFlaggedTransaction } from "../../domain/repositories/IFlaggedTransactionRepository";
import { FlagReason } from "../../domain/value-objects/FlagReason";
import { buildTransaction } from "../../test-support/buildTransaction";
import { FlaggedTransactionMapper } from "./FlaggedTransactionMapper";

const mapper = new FlaggedTransactionMapper();

function buildRecord(): PersistedFlaggedTransaction {
  return {
    flagged: FlaggedTransaction.create(
      buildTransaction({ id: "TXN001", partner: "PART01" }),
      [
        FlagReason.dailyPointsExceeded(),
        FlagReason.dateOutOfRange("fecha futura"),
      ],
    ),
    batchId: "batch-1",
    processedAt: "2026-07-14T00:00:00.000Z",
  };
}

describe("FlaggedTransactionMapper", () => {
  it("traduce la transaccion y TODOS sus motivos a snake_case", () => {
    const response = mapper.toResponse(buildRecord());

    expect(response).toMatchObject({
      transaction_id: "TXN001",
      partner_id: "PART01",
      batch_id: "batch-1",
      processed_at: "2026-07-14T00:00:00.000Z",
    });
    expect(response.flag_reasons).toHaveLength(2);
    expect(response.flag_reasons[0]).toMatchObject({
      code: "DAILY_POINTS_EXCEEDED",
      rule: "RN-01",
    });
    expect(response.flag_reasons[1]).toMatchObject({
      code: "DATE_OUT_OF_RANGE",
      rule: "RN-04",
    });
  });
});
