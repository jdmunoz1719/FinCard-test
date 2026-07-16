import { MemberId } from "../value-objects/MemberId";
import { PartnerId } from "../value-objects/PartnerId";
import { PointAmount } from "../value-objects/PointAmount";
import { TransactionDate } from "../value-objects/TransactionDate";
import { TransactionId } from "../value-objects/TransactionId";

export interface TransactionProps {
  transactionId: TransactionId;
  memberId: MemberId;
  partnerId: PartnerId;
  pointsEarned: PointAmount;
  pointsRedeemed: PointAmount;
  transactionDate: TransactionDate;
  partnerName: string;
}

/**
 * Una transaccion de puntos, ya validada (se construye solo a partir de VOs).
 * Es entidad, no VO: tiene identidad propia (transactionId) — dos
 * transacciones con los mismos montos pero distinto id son distintas.
 */
export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  /** Factory method: unica via de construccion (garantiza props completas). */
  public static create(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  public get transactionId(): TransactionId {
    return this.props.transactionId;
  }

  public get memberId(): MemberId {
    return this.props.memberId;
  }

  public get partnerId(): PartnerId {
    return this.props.partnerId;
  }

  public get pointsEarned(): PointAmount {
    return this.props.pointsEarned;
  }

  public get pointsRedeemed(): PointAmount {
    return this.props.pointsRedeemed;
  }

  public get transactionDate(): TransactionDate {
    return this.props.transactionDate;
  }

  public get partnerName(): string {
    return this.props.partnerName;
  }

  /** Puntos netos de ESTA transaccion (earned - redeemed). Puede ser negativo. */
  public netPoints(): number {
    return this.props.pointsEarned.subtract(this.props.pointsRedeemed);
  }

  /** ¿La transaccion liquida puntos? (points_redeemed > 0). Lo usa RN-02. */
  public hasRedemption(): boolean {
    return this.props.pointsRedeemed.value > 0;
  }

  /** Forma plana para persistencia/serializacion (los adapters no ven VOs). */
  public toPersistence() {
    return {
      transactionId: this.props.transactionId.value,
      memberId: this.props.memberId.value,
      partnerId: this.props.partnerId.value,
      pointsEarned: this.props.pointsEarned.value,
      pointsRedeemed: this.props.pointsRedeemed.value,
      transactionDate: this.props.transactionDate.toString(),
      partnerName: this.props.partnerName,
    };
  }
}
