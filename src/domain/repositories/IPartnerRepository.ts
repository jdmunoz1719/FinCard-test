import { Result } from "../../shared/types/Result";

export interface PartnerRecord {
  partnerId: string;
  partnerName: string;
}

/** Puerto de datos de referencia de aliados. RF-04 lo usa para resolver
 *  partner_name y para saber si responder 404. */
export interface IPartnerRepository {
  findById(partnerId: string): Promise<Result<PartnerRecord | null, Error>>;
}
