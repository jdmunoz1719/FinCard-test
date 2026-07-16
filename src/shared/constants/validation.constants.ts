/**
 * @file validation.constants.ts
 * @description Umbrales de las reglas de negocio RN-01..RN-04 en un unico lugar.
 *              Cada regla de infrastructure/validators/rules importa desde aqui.
 * @layer shared
 * @dependencies ninguna
 */

/** RN-01: tope de puntos netos que un miembro puede acumular en un mismo dia. */
export const MAX_DAILY_NET_POINTS_PER_MEMBER = 10_000;

/** RN-02: proporcion maxima de transacciones diarias de un aliado con points_redeemed > 0. */
export const MAX_DAILY_REDEMPTION_RATIO = 0.3;

/** RN-03: maximo de transacciones por miembro con el mismo aliado en un mismo dia. */
export const MAX_DAILY_TRANSACTIONS_PER_MEMBER_PARTNER = 5;

/** RN-04: antiguedad maxima (en años) permitida para transaction_date. */
export const MAX_TRANSACTION_AGE_YEARS = 2;
