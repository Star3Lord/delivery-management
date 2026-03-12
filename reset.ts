import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { reset } from 'drizzle-seed';
import {
  customer,
  product,
  vehicle,
  delivery_slip,
  bill,
  bill_item,
  receipt,
  import_session,
  import_row,
} from './src/lib/server/db/schema/index';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  const tables = {
    customer,
    product,
    vehicle,
    delivery_slip,
    bill,
    bill_item,
    receipt,
    import_session,
    import_row,
  };

  console.log('Resetting database...');
  await reset(db, tables);
  console.log('Database reset successfully!');

  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
