import { eq, and, gte, lte, sql, desc, type SQL } from 'drizzle-orm';
import * as v from 'valibot';
import { query } from '$app/server';
import { get_db } from '$lib/server/db';
import { bill, bill_item, receipt, customer } from '$lib/server/db/schema';

const ledger_validator = v.object({
  party_id: v.optional(v.string()),
  from: v.optional(v.string()),
  to: v.optional(v.string()),
  limit: v.optional(v.number()),
  offset: v.optional(v.number()),
});

export const get_ledger_entries = query(ledger_validator, async (args) => {
  const { party_id, from, to, limit = 50, offset = 0 } = args;

  const db = get_db();

  const ledger = db.$with('ledger').as(
    db
      .select({
        id: bill.id,
        date: sql<string>`${bill.date_end}`.as('date'),
        type: sql<string>`'bill'`.as('type'),
        debit: sql<number>`coalesce(sum(${bill_item.amount}::numeric), 0)`.as(
          'debit'
        ),
        credit: sql<number>`0::numeric`.as('credit'),
        party_id: bill.party_id,
        metadata: bill.metadata,
        created_at: bill.created_at,
        updated_at: bill.updated_at,
      })
      .from(bill)
      .leftJoin(bill_item, eq(bill_item.bill_id, bill.id))
      .groupBy(bill.id)
      .unionAll(
        db
          .select({
            id: receipt.id,
            date: receipt.date,
            type: sql<string>`'receipt'`.as('type'),
            debit: sql<number>`0::numeric`.as('debit'),
            credit: sql<number>`${receipt.amount}::numeric`.as('credit'),
            party_id: receipt.party_id,
            metadata: receipt.metadata,
            created_at: receipt.created_at,
            updated_at: receipt.updated_at,
          })
          .from(receipt)
      )
  );

  const filters: SQL[] = [];
  if (party_id) filters.push(eq(ledger.party_id, party_id));
  if (from) filters.push(gte(ledger.date, from));
  if (to) filters.push(lte(ledger.date, to));

  return db
    .with(ledger)
    .select({
      id: ledger.id,
      date: ledger.date,
      type: ledger.type,
      debit: ledger.debit,
      credit: ledger.credit,
      balance: sql<number>`sum(${ledger.debit} - ${ledger.credit}) over (
				partition by ${ledger.party_id}
				order by ${ledger.date} asc, ${ledger.created_at} asc
				rows between unbounded preceding and current row
			)`,
      party: sql`jsonb_build_object(
				'id', ${customer.id}, 'name', ${customer.name},
				'address', ${customer.address}, 'phone', ${customer.phone},
				'email', ${customer.email},
				'created_at', ${customer.created_at}, 'updated_at', ${customer.updated_at}
            )`,
      metadata: ledger.metadata,
      created_at: ledger.created_at,
      updated_at: ledger.updated_at,
    })
    .from(ledger)
    .innerJoin(customer, eq(customer.id, ledger.party_id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(ledger.date), desc(ledger.created_at))
    .limit(limit)
    .offset(offset);
});
