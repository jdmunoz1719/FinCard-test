import { randomUUID } from "node:crypto";
import { IIdGenerator } from "../../domain/services/IIdGenerator";

/** Genera UUIDs v4 para identificar batches. */
export class UuidGenerator implements IIdGenerator {
  public generate(): string {
    return randomUUID();
  }
}
