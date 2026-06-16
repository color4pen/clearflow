import { drizzle } from "drizzle-orm/postgres-js";
import { PgDatabase } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

function createDrizzleDB(): DrizzleDB {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = postgres(databaseUrl);
  return drizzle(client, { schema });
}

let _db: DrizzleDB | undefined;

function getDb(): DrizzleDB {
  if (!_db) {
    _db = createDrizzleDB();
  }
  return _db;
}

/**
 * Lazily-initialized Drizzle client.
 * The DATABASE_URL check is deferred to the first actual database operation,
 * so the module can be safely imported during Next.js build-time page data collection.
 * At runtime, accessing any property triggers initialization and throws if DATABASE_URL is unset.
 */
export const db = new Proxy({} as DrizzleDB, {
  get(_, prop) {
    return Reflect.get(getDb(), prop as string | symbol);
  },
  // Make the proxy appear as a PgDatabase instance so that DrizzleAdapter's type check
  // passes without eagerly initializing the database connection.
  getPrototypeOf() {
    return PgDatabase.prototype as object;
  },
});

export type Transaction = Parameters<Parameters<DrizzleDB["transaction"]>[0]>[0];
