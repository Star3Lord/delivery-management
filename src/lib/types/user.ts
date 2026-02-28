import type { Auditable } from './shared';

export type User = Auditable & {
  id: string;
};
