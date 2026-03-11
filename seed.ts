import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { seed, reset } from 'drizzle-seed';
import {
  customer,
  product,
  vehicle,
  delivery_slip,
  bill,
  bill_item,
  receipt,
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
  };

  console.log('Resetting database...');
  await reset(db, tables);

  console.log('Seeding database...');
  await seed(db, tables).refine((f) => ({
    customer: {
      count: 10,
      columns: {
        name: f.companyName(),
        address: f.streetAddress(),
        phone: f.phoneNumber({ template: '+91 ##### #####' }),
        email: f.email(),
      },
      with: {
        // 1-3 deliveries per day * 30 days = 30-90 per customer
        delivery_slip: [
          { weight: 0.33, count: [30, 35, 40] },
          { weight: 0.34, count: [45, 50, 60] },
          { weight: 0.33, count: [70, 80, 90] },
        ],
        // 1 bill every 5 days over 30 days = 6 bills per customer
        bill: 6,
        // 1-3 receipts per customer over the 30-day period
        receipt: [
          { weight: 0.33, count: [1] },
          { weight: 0.34, count: [2] },
          { weight: 0.33, count: [3] },
        ],
      },
    },
    product: {
      count: 10,
      columns: {
        name: f.valuesFromArray({
          values: [
            '10mm Aggregate',
            '20mm Aggregate',
            '40mm Aggregate',
            'Stone Dust',
            'Crusher Run',
            'M-Sand',
            'P-Sand',
            'Gravel',
            'Ballast',
            'GSB Material',
          ],
        }),
      },
    },
    vehicle: {
      count: 20,
      columns: {
        number_plate: f.valuesFromArray({
          values: [
            'MH-12-AB-1234',
            'MH-14-CD-5678',
            'MH-43-EF-9012',
            'MH-04-GH-3456',
            'MH-20-IJ-7890',
            'KA-01-KL-2345',
            'KA-05-MN-6789',
            'GJ-01-OP-4321',
            'GJ-05-QR-8765',
            'RJ-14-ST-1357',
            'RJ-19-UV-2468',
            'MP-09-WX-3579',
            'UP-32-YZ-4680',
            'TN-01-AA-5791',
            'AP-07-BB-6802',
            'HR-55-CC-7913',
            'PB-08-DD-8024',
            'CG-04-EE-9135',
            'JH-01-FF-0246',
            'BR-01-GG-1357',
          ],
        }),
        vehicle_type: f.valuesFromArray({
          values: ['Truck', 'Tipper', 'Trailer', 'Dumper'],
        }),
      },
    },
    delivery_slip: {
      columns: {
        date: f.date({ minDate: '2026-01-29', maxDate: '2026-02-27' }),
        royalty_number: f.valuesFromArray({
          values: Array.from(
            { length: 500 },
            (_, i) => `RY-${String(10000 + i)}`
          ),
        }),
        royalty_quantity: f.number({
          minValue: 5,
          maxValue: 50,
          precision: 100,
        }),
        royalty_quantity_unit: f.valuesFromArray({
          values: ['tonne', 'kg'],
        }),
        product_quantity: f.number({
          minValue: 5,
          maxValue: 50,
          precision: 100,
        }),
        product_quantity_unit: f.valuesFromArray({
          values: ['tonne', 'kg'],
        }),
        state: f.valuesFromArray({
          values: ['pending', 'billed', 'discarded'],
        }),
      },
    },
    bill: {
      columns: {
        date_start: f.date({ minDate: '2026-01-29', maxDate: '2026-02-22' }),
        date_end: f.date({ minDate: '2026-02-03', maxDate: '2026-02-27' }),
      },
      with: {
        bill_item: [
          { weight: 0.4, count: [3, 4, 5] },
          { weight: 0.4, count: [6, 7, 8] },
          { weight: 0.2, count: [9, 10] },
        ],
      },
    },
    bill_item: {
      columns: {
        type: f.valuesFromArray({ values: ['product', 'charge'] }),
        description: f.loremIpsum({ sentencesCount: 1 }),
        quantity: f.number({ minValue: 5, maxValue: 100, precision: 100 }),
        unit: f.valuesFromArray({ values: ['tonne', 'kg'] }),
        rate: f.number({ minValue: 50, maxValue: 500, precision: 100 }),
        amount: f.number({ minValue: 500, maxValue: 50000, precision: 100 }),
        sort_order: f.int({ minValue: 0, maxValue: 20 }),
      },
    },
    receipt: {
      columns: {
        date: f.date({ minDate: '2026-01-29', maxDate: '2026-02-27' }),
        amount: f.number({ minValue: 5000, maxValue: 100000, precision: 100 }),
      },
    },
  }));

  const remarks = [
    'Delayed due to rain',
    'Customer requested early morning delivery',
    'Partial load — vehicle breakdown',
    'Rate negotiated on site',
    'Extra loading charges applied',
    'Material quality disputed by party',
    'Weigh-bridge slip attached',
    'Return trip — empty vehicle',
    'Oversized load, special permit used',
    'Cash payment collected on delivery',
  ];

  console.log('Adding remarks to ~10% of delivery slips...');
  const allSlips = await db
    .select({ id: delivery_slip.id })
    .from(delivery_slip);

  const slipsWithRemarks = allSlips.filter(() => Math.random() < 0.1);

  for (const slip of slipsWithRemarks) {
    const remark = remarks[Math.floor(Math.random() * remarks.length)];
    await db
      .update(delivery_slip)
      .set({
        metadata: sql`jsonb_set(metadata, '{remarks}', ${JSON.stringify(remark)}::jsonb)`,
      })
      .where(eq(delivery_slip.id, slip.id));
  }

  console.log('Database seeded successfully!');
  await client.end();
  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
