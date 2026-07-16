/**
 * @file dateRangeGenerator.ts
 * @description Genera el array completo de fechas ISO de un rango. Lo usa el
 *              SettlementCalculator (RF-04) para que daily_breakdown incluya
 *              TODOS los dias del periodo, con ceros en los dias sin transacciones.
 * @layer shared
 * @dependencies ninguna
 */

/**
 * Enumera todas las fechas ISO (YYYY-MM-DD) entre from y to, ambas inclusive.
 *
 * Trabaja en UTC con aritmetica de milisegundos (+86,400,000 por dia) para no
 * depender de la zona horaria del servidor ni tropezar con cambios de horario.
 *
 * @param fromIso - string - Fecha inicial YYYY-MM-DD (inclusive)
 * @param toIso - string - Fecha final YYYY-MM-DD (inclusive)
 * @returns string[] - Fechas ISO consecutivas; vacio si from > to
 *
 * Ejemplo de uso:
 * ```ts
 * generateIsoDateRange("2026-07-01", "2026-07-03");
 * // ["2026-07-01", "2026-07-02", "2026-07-03"]
 * ```
 */
export function generateIsoDateRange(fromIso: string, toIso: string): string[] {
  const [fy, fm, fd] = fromIso.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ty, tm, td] = toIso.split("-").map(Number) as [number, number, number];
  const end = Date.UTC(ty, tm - 1, td);

  const dates: string[] = [];
  let cursor = Date.UTC(fy, fm - 1, fd);
  while (cursor <= end) {
    const d = new Date(cursor);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor += 24 * 60 * 60 * 1000;
  }
  return dates;
}
