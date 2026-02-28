import type { Auditable } from './shared';

export type Vehicle = Auditable & {
  id: string;
  number_plate: string;
  vehicle_type?: string | null;
  metadata: Record<string, unknown>;
};

export type Customer = Auditable & {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  metadata: Record<string, unknown>;
};

export type Product = Auditable & {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
};

export type DeliverySlipState = 'pending' | 'billed' | 'discarded';

export type DeliverySlip = Auditable & {
  id: string;
  external_id: string;
  date: string;
  party_id: string | null;
  vehicle_id: string | null;
  royalty_number: string;
  royalty_quantity: string;
  royalty_quantity_unit: string;
  product_id: string | null;
  product_quantity: string | null;
  product_quantity_unit: string;
  state: DeliverySlipState;
  metadata: Record<string, unknown>;
  party?: Customer | null;
  vehicle?: Vehicle | null;
  product?: Product | null;
};

export type DeliverySlipColumn =
  | 'external_id'
  | 'date'
  | 'party_id'
  | 'vehicle_id'
  | 'royalty_number'
  | 'royalty_quantity'
  | 'product_id'
  | 'product_quantity'
  | 'state';
