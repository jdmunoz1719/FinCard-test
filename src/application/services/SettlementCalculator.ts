import { Transaction } from "../../domain/entities/Transaction";
import { PartnerRecord } from "../../domain/repositories/IPartnerRepository";
import {
  DailySettlementEntry,
  SettlementSummary,
} from "../../domain/use-cases/IGetSettlementUseCase";
import { generateIsoDateRange } from "../../shared/utils/dateRangeGenerator";

/**
 * Calcula la liquidacion de un aliado (RF-04): totales del periodo mas un
 * daily_breakdown COMPLETO (todos los dias del rango, con ceros donde no
 * hubo movimiento). Funcion pura sobre entidades.
 *
 * rawNetPoints va sin clamping (earned - redeemed, puede ser negativo)
 * el mapper decide como exponerlo hacia afuera.
 */
export class SettlementCalculator {
  public calculate(
    partner: PartnerRecord,
    transactions: Transaction[],
    fromIso: string,
    toIso: string,
  ): SettlementSummary {
    // Una sola pasada por las transacciones: acumula totales globales y por dia.
    const totalsByDate = new Map<
      string,
      { transactions: number; earned: number; redeemed: number }
    >();
    let totalEarned = 0;
    let totalRedeemed = 0;
    const uniqueMembers = new Set<string>();

    for (const t of transactions) {
      const dateKey = t.transactionDate.toString();
      const entry = totalsByDate.get(dateKey) ?? {
        transactions: 0,
        earned: 0,
        redeemed: 0,
      };
      entry.transactions += 1;
      entry.earned += t.pointsEarned.value;
      entry.redeemed += t.pointsRedeemed.value;
      totalsByDate.set(dateKey, entry);

      totalEarned += t.pointsEarned.value;
      totalRedeemed += t.pointsRedeemed.value;
      uniqueMembers.add(t.memberId.value);
    }

    // Se genera el rango COMPLETO primero y se hace merge con los acumulados:
    // asi los dias sin actividad aparecen con ceros (exigencia de RF-04).
    const dailyBreakdown: DailySettlementEntry[] = generateIsoDateRange(
      fromIso,
      toIso,
    ).map((date) => {
      const entry = totalsByDate.get(date);
      return {
        date,
        transactions: entry?.transactions ?? 0,
        pointsEarned: entry?.earned ?? 0,
        pointsRedeemed: entry?.redeemed ?? 0,
      };
    });

    return {
      partner,
      period: { from: fromIso, to: toIso },
      totalTransactions: transactions.length,
      totalPointsEarned: totalEarned,
      totalPointsRedeemed: totalRedeemed,
      rawNetPoints: totalEarned - totalRedeemed,
      uniqueMembers: uniqueMembers.size,
      dailyBreakdown,
    };
  }
}
