import { createHash } from "node:crypto";
import { IHashGenerator } from "../../domain/services/IHashGenerator";

/** Calcula SHA-256 en hexadecimal (RF-02: hash del archivo original en el manifest). */
export class CryptoHashGenerator implements IHashGenerator {
  public sha256(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }
}
