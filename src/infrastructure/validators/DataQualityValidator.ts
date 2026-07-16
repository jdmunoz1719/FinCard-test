import { RowValidationError } from "../../domain/entities/ProcessingManifest";
import { Transaction } from "../../domain/entities/Transaction";
import { InvalidCsvFormatException } from "../../domain/exceptions/InvalidCsvFormatException";
import { ParsedCsv } from "../../domain/services/ICsvParser";
import {
  DataQualityResult,
  IDataQualityValidator,
} from "../../domain/services/IDataQualityValidator";
import { MemberId } from "../../domain/value-objects/MemberId";
import { PartnerId } from "../../domain/value-objects/PartnerId";
import { PointAmount } from "../../domain/value-objects/PointAmount";
import { TransactionDate } from "../../domain/value-objects/TransactionDate";
import { TransactionId } from "../../domain/value-objects/TransactionId";
import {
  REQUIRED_CSV_COLUMNS,
  RequiredCsvColumn,
} from "../../shared/constants/file.constants";

/**
 * Valida cada fila del CSV contra el schema RF-01 usando los predicados
 * isValid() de los value objects del dominio (una unica fuente de verdad por
 * campo). Acumula errores {fila, columna, mensaje} en vez de abortar, para
 * soportar procesamiento parcial. Columnas faltantes en el header son un
 * error estructural y lanzan InvalidCsvFormatException.
 */
export class DataQualityValidator implements IDataQualityValidator {
  public validate(parsed: ParsedCsv): DataQualityResult {
    const columnIndex = this.resolveColumnIndex(parsed.header);
    const errors: RowValidationError[] = [];
    const transactions: Transaction[] = [];
    const seenTransactionIds = new Set<string>();

    parsed.rows.forEach((rawRow, index) => {
      const row = index + 1; // 1 = primera fila de datos (el header no cuenta)

      if (rawRow.length !== parsed.header.length) {
        errors.push({
          row,
          column: "*",
          message: `Fila incompleta: se esperaban ${parsed.header.length} columnas, se encontraron ${rawRow.length}`,
        });
        return;
      }

      const get = (column: RequiredCsvColumn): string =>
        (rawRow[columnIndex[column]!] ?? "").trim();

      const values = {
        transactionId: get("transaction_id"),
        memberId: get("member_id"),
        partnerId: get("partner_id"),
        pointsEarned: get("points_earned"),
        pointsRedeemed: get("points_redeemed"),
        transactionDate: get("transaction_date"),
        partnerName: get("partner_name"),
      };

      const rowErrors: RowValidationError[] = [];
      const pushError = (column: string, message: string) =>
        rowErrors.push({ row, column, message });

      if (!TransactionId.isValid(values.transactionId)) {
        pushError("transaction_id", "transaction_id no puede estar vacio");
      } else if (seenTransactionIds.has(values.transactionId)) {
        pushError(
          "transaction_id",
          `transaction_id duplicado en el archivo: "${values.transactionId}"`,
        );
      }

      if (!MemberId.isValid(values.memberId)) {
        pushError(
          "member_id",
          `member_id invalido: "${values.memberId}". Formato esperado MEM + 3 digitos`,
        );
      }
      if (!PartnerId.isValid(values.partnerId)) {
        pushError(
          "partner_id",
          `partner_id invalido: "${values.partnerId}". Formato esperado PART + 2 digitos`,
        );
      }
      if (!PointAmount.isValid(values.pointsEarned)) {
        pushError(
          "points_earned",
          `points_earned invalido: "${values.pointsEarned}". Debe ser entero no negativo`,
        );
      }
      if (!PointAmount.isValid(values.pointsRedeemed)) {
        pushError(
          "points_redeemed",
          `points_redeemed invalido: "${values.pointsRedeemed}". Debe ser entero no negativo`,
        );
      }
      if (!TransactionDate.isValid(values.transactionDate)) {
        pushError(
          "transaction_date",
          `transaction_date invalida: "${values.transactionDate}". Formato esperado YYYY-MM-DD`,
        );
      }
      if (values.partnerName.length === 0) {
        pushError("partner_name", "partner_name no puede estar vacio");
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        return; // la fila se rechaza; las demas siguen (procesamiento parcial)
      }

      // Todos los campos validados: construir la entidad es seguro
      seenTransactionIds.add(values.transactionId);
      transactions.push(
        Transaction.create({
          transactionId: TransactionId.create(values.transactionId),
          memberId: MemberId.create(values.memberId),
          partnerId: PartnerId.create(values.partnerId),
          pointsEarned: PointAmount.create(
            values.pointsEarned,
            "points_earned",
          ),
          pointsRedeemed: PointAmount.create(
            values.pointsRedeemed,
            "points_redeemed",
          ),
          transactionDate: TransactionDate.create(values.transactionDate),
          partnerName: values.partnerName,
        }),
      );
    });

    return { transactions, errors };
  }

  /** Resuelve la posicion de cada columna requerida; acepta cualquier orden. */
  private resolveColumnIndex(
    header: string[],
  ): Record<RequiredCsvColumn, number> {
    const missing = REQUIRED_CSV_COLUMNS.filter((col) => !header.includes(col));
    if (missing.length > 0) {
      throw new InvalidCsvFormatException(
        `CSV no tiene el formato esperado. Columnas faltantes: ${missing.join(", ")}`,
      );
    }
    const index = {} as Record<RequiredCsvColumn, number>;
    for (const col of REQUIRED_CSV_COLUMNS) {
      index[col] = header.indexOf(col);
    }
    return index;
  }
}
