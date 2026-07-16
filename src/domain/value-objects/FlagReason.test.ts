/** Tests del VO FlagReason: catalogo cerrado de motivos con codigo estable + regla de origen. */

import { describe, expect, it } from "vitest";
import { FlagReason } from "./FlagReason";

describe("FlagReason", () => {
  it("cada factory produce el codigo estable y la regla RN correcta", () => {
    expect(FlagReason.dailyPointsExceeded().code).toBe("DAILY_POINTS_EXCEEDED");
    expect(FlagReason.dailyPointsExceeded().rule).toBe("RN-01");
    expect(FlagReason.redemptionRatioExceeded().rule).toBe("RN-02");
    expect(FlagReason.memberDailyLimitExceeded().rule).toBe("RN-03");
    expect(FlagReason.dateOutOfRange("detalle").rule).toBe("RN-04");
  });

  it("dateOutOfRange conserva el detalle especifico del mensaje", () => {
    const reason = FlagReason.dateOutOfRange(
      "transaction_date es una fecha futura",
    );
    expect(reason.message).toBe("transaction_date es una fecha futura");
  });

  it("equals compara por codigo (identidad por valor)", () => {
    expect(
      FlagReason.dailyPointsExceeded().equals(FlagReason.dailyPointsExceeded()),
    ).toBe(true);
    expect(
      FlagReason.dailyPointsExceeded().equals(
        FlagReason.redemptionRatioExceeded(),
      ),
    ).toBe(false);
  });

  it("fromPersistence reconstruye un motivo identico al original", () => {
    const original = FlagReason.memberDailyLimitExceeded();
    const rebuilt = FlagReason.fromPersistence(
      original.code,
      original.rule,
      original.message,
    );
    expect(rebuilt.equals(original)).toBe(true);
    expect(rebuilt.message).toBe(original.message);
  });
});
