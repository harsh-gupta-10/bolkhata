import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { schemaStatements } from "@/lib/schema";

export interface Sql {
  all<T>(query: string, ...params: unknown[]): Promise<T[]>;
  get<T>(query: string, ...params: unknown[]): Promise<T | null>;
  run(query: string, ...params: unknown[]): Promise<void>;
}

let sqlitePromise: Promise<Sql> | null = null;
let ready: Promise<void> | null = null;

interface D1Prepared {
  bind: (...params: unknown[]) => D1Prepared;
  all: () => Promise<{ results?: unknown[] }>;
  first: () => Promise<unknown>;
  run: () => Promise<unknown>;
}

interface D1Database {
  prepare: (query: string) => D1Prepared;
  exec?: (query: string) => Promise<unknown>;
}

export async function getDb(): Promise<Sql> {
  const db = (await cloudflareDb()) ?? (await localDb());
  if (!ready) ready = ensureSchema(db);
  await ready;
  return db;
}

async function cloudflareDb(): Promise<Sql | null> {
  try {
    const specifier = "cloudflare:" + "workers";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as { env?: { DB?: D1Database } };
    const db = mod.env?.DB;
    if (!db?.prepare) return null;
    return {
      async all(query, ...params) {
        const result = await db.prepare(query).bind(...params).all();
        return (result.results ?? []) as never[];
      },
      async get(query, ...params) {
        const row = await db.prepare(query).bind(...params).first();
        return (row ?? null) as never;
      },
      async run(query, ...params) {
        await db.prepare(query).bind(...params).run();
      },
    };
  } catch {
    return null;
  }
}

async function localDb(): Promise<Sql> {
  if (!sqlitePromise) sqlitePromise = openSqlite();
  return sqlitePromise;
}

async function openSqlite(): Promise<Sql> {
  const { DatabaseSync } = await import("node:sqlite");
  const dir = join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const database = new DatabaseSync(join(dir, "bolkhata.sqlite"));
  database.exec("PRAGMA foreign_keys = ON");
  return {
      async all(query, ...params) {
      return database.prepare(query).all(...(params as Array<string | number | null | bigint>)) as never[];
    },
    async get(query, ...params) {
      const row = database.prepare(query).get(...(params as Array<string | number | null | bigint>));
      return (row ?? null) as never;
    },
    async run(query, ...params) {
      database.prepare(query).run(...(params as Array<string | number | null | bigint>));
    },
  };
}

async function ensureSchema(db: Sql): Promise<void> {
  for (const statement of schemaStatements()) {
    try {
      await db.run(statement);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column/i.test(message)) throw error;
    }
  }
}
