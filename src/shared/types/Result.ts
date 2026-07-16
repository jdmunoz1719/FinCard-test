/**
 * @file Result.ts
 * @description Tipo Result<T, E> para manejo funcional de errores sin excepciones.
 *              Los ports de salida del dominio (repositorios, storage, catalogo)
 *              devuelven Result para que el fallo de infraestructura sea un valor
 *              explicito que el caso de uso decide como manejar, en vez de un
 *              throw invisible en la firma.
 * @layer shared
 * @dependencies ninguna
 */

/**
 * Result
 *
 * Responsabilidad: representar el resultado de una operacion que puede fallar,
 * forzando al consumidor a decidir explicitamente que hacer en cada rama.
 *
 * Patron aplicado: Result Pattern.
 * - Exito:  Result.ok(valor)
 * - Fallo:  Result.fail(error)
 *
 * Las excepciones quedan reservadas para casos realmente excepcionales
 * (violacion de invariantes de dominio, bugs), no para flujo de control.
 *
 * @example
 * const result = await repository.saveBatch(transactions);
 * if (result.isFail) {
 *   // decidir: reintentar, propagar, degradar...
 * }
 */
export class Result<T, E = Error> {
  private constructor(
    public readonly isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E,
  ) {}

  /** Crea un Result exitoso. `value` puede omitirse para operaciones void. */
  public static ok<T, E = Error>(value?: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /** Crea un Result fallido con el error que describe la causa. */
  public static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public get isFail(): boolean {
    return !this.isOk;
  }

  /**
   * Valor del resultado exitoso.
   * @throws Error - si se accede sobre un Result fallido (bug del consumidor:
   *                 siempre verificar isOk/isFail antes de leer).
   */
  public get value(): T {
    if (!this.isOk)
      throw new Error(
        "No se puede leer 'value' de un Result fallido. Verificar isOk primero.",
      );

    return this._value as T;
  }

  /**
   * Error del resultado fallido.
   * @throws Error - si se accede sobre un Result exitoso.
   */
  public get error(): E {
    if (this.isOk)
      throw new Error(
        "No se puede leer 'error' de un Result exitoso. Verificar isFail primero.",
      );

    return this._error as E;
  }
}
