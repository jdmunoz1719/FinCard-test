import { RowValidationError } from "../../domain/entities/ProcessingManifest";
import { UploadTransactionsOutput } from "../../domain/use-cases/IUploadTransactionsUseCase";
import {
  RowErrorDto,
  UploadTransactionsResponse,
} from "../dto/response/UploadTransactionsResponse";

/** Traduce el resultado "processed" del upload a UploadTransactionsResponse. Sin logica de negocio. */
export class UploadResultMapper {
  public toResponse(
    output: Extract<UploadTransactionsOutput, { outcome: "processed" }>,
  ): UploadTransactionsResponse {
    return {
      batch_id: output.batchId,
      total_rows: output.totalRows,
      valid_rows: output.validRows,
      rejected_rows: output.rejectedRows,
      errors: output.rowErrors.map(this.toRowErrorDto),
      manifest: {
        total_valid_rows: output.manifest.totalValidRows,
        total_rejected_rows: output.manifest.totalRejectedRows,
        errors: output.manifest.rowErrors.map(this.toRowErrorDto),
        processed_at: output.manifest.processedAt,
        original_file_sha256: output.manifest.originalFileSha256,
      },
      storage_path: output.storagePath,
      flagged_count: output.flaggedCount,
    };
  }

  private toRowErrorDto(error: RowValidationError): RowErrorDto {
    return { row: error.row, column: error.column, message: error.message };
  }
}
