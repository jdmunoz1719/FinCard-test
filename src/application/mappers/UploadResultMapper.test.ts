/** Tests del mapper de resultado de upload (RF-01/RF-02): shape wire snake_case, manifest incluido. */

import { describe, expect, it } from "vitest";
import { ProcessingManifest } from "../../domain/entities/ProcessingManifest";
import { UploadTransactionsOutput } from "../../domain/use-cases/IUploadTransactionsUseCase";
import { UploadResultMapper } from "./UploadResultMapper";

const mapper = new UploadResultMapper();

function buildOutput(): Extract<
  UploadTransactionsOutput,
  { outcome: "processed" }
> {
  return {
    outcome: "processed",
    batchId: "batch-1",
    totalRows: 2,
    validRows: 1,
    rejectedRows: 1,
    rowErrors: [{ row: 2, column: "member_id", message: "formato invalido" }],
    flaggedCount: 0,
    manifest: ProcessingManifest.create({
      batchId: "batch-1",
      totalValidRows: 1,
      totalRejectedRows: 1,
      totalFlaggedRows: 0,
      rowErrors: [{ row: 2, column: "member_id", message: "formato invalido" }],
      processedAt: "2026-07-14T00:00:00.000Z",
      originalFileSha256: "a".repeat(64),
    }),
    storagePath: "mem://raw/batch-1.csv",
  };
}

describe("UploadResultMapper", () => {
  it("traduce el resultado a snake_case, incluyendo errores por fila y manifest", () => {
    const response = mapper.toResponse(buildOutput());

    expect(response).toMatchObject({
      batch_id: "batch-1",
      total_rows: 2,
      valid_rows: 1,
      rejected_rows: 1,
      flagged_count: 0,
      storage_path: "mem://raw/batch-1.csv",
    });
    expect(response.errors).toEqual([
      { row: 2, column: "member_id", message: "formato invalido" },
    ]);
    expect(response.manifest).toMatchObject({
      total_valid_rows: 1,
      total_rejected_rows: 1,
      original_file_sha256: "a".repeat(64),
    });
    expect(response.manifest.errors).toEqual(response.errors);
  });
});
