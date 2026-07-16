import {
  IPartnerRepository,
  PartnerRecord,
} from "../../../domain/repositories/IPartnerRepository";
import { Result } from "../../../shared/types/Result";
import { readJson } from "../../../shared/utils/fileUtils";

/**
 * Resuelve aliados por id desde el JSON de datos de referencia
 * (data/reference/partners.json). En produccion seria una tabla de dimension.
 */
export class JsonPartnerRepository implements IPartnerRepository {
  constructor(private readonly filePath: string) {}

  public async findById(
    partnerId: string,
  ): Promise<Result<PartnerRecord | null, Error>> {
    try {
      const partners = await readJson<PartnerRecord[]>(this.filePath, []);
      return Result.ok(partners.find((p) => p.partnerId === partnerId) ?? null);
    } catch (error) {
      return Result.fail(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }
}
