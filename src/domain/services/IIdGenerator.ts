/** Puerto de generacion de ids de batch — misma razon que IDateProvider:
 *  si el use case llamara randomUUID() directo, los tests no podrian
 *  asertar sobre un batch_id predecible. */
export interface IIdGenerator {
  generate(): string;
}
