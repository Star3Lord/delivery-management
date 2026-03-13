// import { neon, Pool } from "@neondatabase/serverless";
// import { drizzle } from "drizzle-orm/neon-http";
// // import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

// const client = neon(env.DATABASE_URL);
// // const pool = new Pool({ connectionString: env.DATABASE_URL });
// export const db = drizzle({ client: client, schema });
