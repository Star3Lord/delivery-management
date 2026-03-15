import {
  neon,
  Pool as Pool_neon,
  neonConfig,
  type PoolConfig as PoolConfig_neon,
} from '@neondatabase/serverless';
import { drizzle as drizzle_neon_http } from 'drizzle-orm/neon-http';
import { drizzle as drizzle_neon_serverless } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { drizzle as drizzle_postgres_js } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzle_node_postgres } from 'drizzle-orm/node-postgres';
import { Pool as Pool_pg, type PoolConfig as PoolConfig_pg } from 'pg';
import { getRequestEvent } from '$app/server';
// import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

// if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

// const client = postgres(DATABASE_URL);
// export const db = drizzle(client);
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
// });
// export const db = drizzle({ client: pool, schema });

// const client = neon(DATABASE_URL);
// // neonConfig.webSocketConstructor = ws;
// // const pool = new Pool({ connectionString: DATABASE_URL });
// export const db = drizzle({ client: client });

const get_db_with_neon = (
  connection_string: string,
  config: Parameters<typeof neon>[1] | PoolConfig_neon = {},
  with_transaction: boolean = false
) => {
  if (with_transaction) {
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool_neon({
      connectionString: connection_string,
      ...config,
      max: 5,
    });
    return drizzle_neon_serverless({ client: pool });
  }
  const client = neon(connection_string, config);
  return drizzle_neon_http({ client });
};

const get_db_with_node_postgres = (
  connection_string: string,
  config: PoolConfig_pg = {},
  with_pool: boolean = false
) => {
  if (with_pool) {
    const pool = new Pool_pg({
      connectionString: connection_string,
      ...config,
      max: 5,
    });
    return drizzle_node_postgres({ client: pool });
  }
  return drizzle_node_postgres({ connection: connection_string, ...config });
};

const get_db_with_postgres_js = (
  connection_string: string,
  config: Parameters<typeof postgres>[1] = {}
) => {
  const client = postgres(connection_string, {
    ...config,
    max: 5,
  });
  return drizzle_postgres_js({ client });
};

// let _db:
//   | ReturnType<typeof drizzle_node_postgres>
//   | ReturnType<typeof drizzle_postgres_js>
//   | ReturnType<typeof drizzle_neon_http>
//   | ReturnType<typeof drizzle_neon_serverless>
//   | null = null;

export function get_db() {
  //   if (_db !== null) {
  //     return _db;
  //   }
  const { platform } = getRequestEvent();
  const HYPERDRIVE = platform?.env?.HYPERDRIVE;
  if (!HYPERDRIVE) throw new Error('HYPERDRIVE is not set');
  // if (_db === null) {
  //     const client = postgres(HYPERDRIVE.connectionString);
  //     _db = drizzle(client);
  // }
  // return _db;
  // _db = get_db_with_postgres_js(HYPERDRIVE.connectionString, {
  //     // connect_timeout: 60000,
  //     fetch_types: false,
  // });
  //   _db = get_db_with_node_postgres(HYPERDRIVE.connectionString, {});
  //   // _db = get_db_with_neon(HYPERDRIVE.connectionString, { }, false);
  //   return _db;
  return get_db_with_postgres_js(HYPERDRIVE.connectionString, {
    // connect_timeout: 60000,
    fetch_types: false,
  });
}
