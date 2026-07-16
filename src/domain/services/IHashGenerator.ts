/** Puerto de hashing. RF-02 exige el SHA-256 del archivo original en el
 *  manifest; el dominio no importa node:crypto directo, lo recibe de aca. */
export interface IHashGenerator {
  sha256(content: string): string;
}
