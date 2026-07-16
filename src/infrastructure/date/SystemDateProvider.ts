import { IDateProvider } from "../../domain/services/IDateProvider";

/** Reloj real del sistema. En tests se sustituye por un provider de fecha fija (RN-04 determinista). */
export class SystemDateProvider implements IDateProvider {
  public now(): Date {
    return new Date();
  }
}
