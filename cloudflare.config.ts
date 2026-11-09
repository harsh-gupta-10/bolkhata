import { bindings, defineConfig, defineWorker } from "cf/config";

/**
 * Vinext / `cf deploy` source of truth.
 * D1 binding name: DB
 * Database name: bolkhata
 *
 * Do not add KV, VINEXT_KV_CACHE, or any cache binding.
 * Free-tier deploy uses `build:vinext` then `cf deploy --prebuilt` (not deploy:vinext).
 *
 * Parent creates the database and applies db/schema.sql before the first deploy:
 *   npx wrangler d1 create bolkhata
 *   npx wrangler d1 execute bolkhata --remote --file=db/schema.sql
 */
export default defineConfig({
  worker: defineWorker({
    name: "bolkhata",
    accountId: "b1d481965d10a5b83a86f3ba67c2e0ed",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-06",
    compatibilityFlags: ["nodejs_compat"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      DB: bindings.d1({ name: "bolkhata" }),
    },
  }),
});
