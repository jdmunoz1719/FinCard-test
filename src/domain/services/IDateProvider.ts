/**
 * Puerto del reloj. RN-04 compara transaction_date contra "hoy" — sin este
 * puerto el dominio llamaria new Date() directo y los tests dependerian del
 * dia en que corren. Con esto, los tests inyectan una fecha fija.
 */
export interface IDateProvider {
  now(): Date;
}
