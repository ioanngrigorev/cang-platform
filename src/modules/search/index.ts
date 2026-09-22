import "server-only";
import { PostgresSearchProvider } from "./postgres";
import type { SearchProvider } from "./types";

export * from "./types";

let provider: SearchProvider | null = null;

/**
 * Search provider factory. Postgres full-text search is the default;
 * an OpenSearch provider can be added (SEARCH_PROVIDER=opensearch) implementing the same interface,
 * fed by an indexer that listens to product/company writes.
 */
export function search(): SearchProvider {
  if (provider) return provider;
  // if (process.env.SEARCH_PROVIDER === "opensearch") provider = new OpenSearchProvider(process.env.OPENSEARCH_URL!)
  provider = new PostgresSearchProvider();
  return provider;
}
