import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// Reuse the pool across hot reloads / serverless invocations in the same
// process. Neon requires TLS; local Postgres typically doesn't offer it.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  });
globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
