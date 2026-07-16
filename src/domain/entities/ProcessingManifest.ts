/** Error de validacion de una fila (1 = primera fila de datos, sin contar header). */
export interface RowValidationError {
  row: number;
  column: string;
  message: string;
}

/**
 * Registro auditable de que paso al procesar un archivo (RF-02): cuantas
 * filas entraron, cuantas se rechazaron y por que, cuantas quedaron en
 * revision, y el hash del original (para detectar reenvios o corrupcion).
 */
export class ProcessingManifest {
  private constructor(
    public readonly batchId: string,
    public readonly totalValidRows: number,
    public readonly totalRejectedRows: number,
    public readonly totalFlaggedRows: number,
    public readonly rowErrors: RowValidationError[],
    public readonly processedAt: string,
    public readonly originalFileSha256: string,
  ) {}

  public static create(input: {
    batchId: string;
    totalValidRows: number;
    totalRejectedRows: number;
    totalFlaggedRows: number;
    rowErrors: RowValidationError[];
    processedAt: string;
    originalFileSha256: string;
  }): ProcessingManifest {
    return new ProcessingManifest(
      input.batchId,
      input.totalValidRows,
      input.totalRejectedRows,
      input.totalFlaggedRows,
      input.rowErrors,
      input.processedAt,
      input.originalFileSha256,
    );
  }

  public toJSON() {
    return {
      batchId: this.batchId,
      totalValidRows: this.totalValidRows,
      totalRejectedRows: this.totalRejectedRows,
      totalFlaggedRows: this.totalFlaggedRows,
      rowErrors: this.rowErrors,
      processedAt: this.processedAt,
      originalFileSha256: this.originalFileSha256,
    };
  }
}
