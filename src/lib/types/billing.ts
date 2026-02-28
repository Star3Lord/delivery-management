import type { Auditable } from './shared';
import type { DeliverySlip, Product } from './records';

export type Bill = Auditable & {
  id: string;
  party_id: string;
  date_start: Date | number;
  date_end: Date | number;
  royalty_quantity: number;
  royalty_rate: number;
  other_charges: string;
  other_charges_amount: number;
  slips: DeliverySlip[];
  products: BillProduct[];
};

export type Charge = Auditable & {
  id: string;
  type: 'delivery_slip' | 'other';
  name: string;
  amount: number;
};

export type BillProduct = Auditable & {
  id: string;
  product: Product;
  quantity: number;
  rate: number;
};

export type Receipt = Auditable & {
  id: string;
  party_id: string;
  date: Date | number;
  amount: number;
  remarks: string;
};
