import type { Auditable } from './shared';
import type { Customer } from './records';

export type Ledger = Auditable & {
  id: string;
  date: Date | number;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  remarks: string;
  party: Customer;
};

export type LedgerTableColumn =
  | 'date'
  | 'type'
  | 'debit'
  | 'credit'
  | 'balance'
  | 'remarks';
