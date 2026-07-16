/**
 * Base de las excepciones de dominio. Deja que la capa web distinga con un
 * solo instanceof entre "violacion de una regla del negocio" (400) y un
 * error tecnico real (500), sin conocer cada excepcion concreta.
 */
export abstract class DomainException extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
