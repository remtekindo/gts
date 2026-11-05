/**
 * D1 access helper (Cloudflare Pages Functions).
 *
 * The database is bound as `DB` in wrangler.jsonc. On Pages the binding
 * arrives on `event.context.cloudflare.env.DB`; locally (`wrangler pages
 * dev --d1=DB`) the same path is used with a local SQLite file.
 *
 * Minimal structural typing so no @cloudflare/workers-types install is
 * needed for the build to typecheck.
 */

export interface D1Result<T = Record<string, unknown>> {
  results: T[]
  success: boolean
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>
  run(): Promise<{ success: boolean }>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

export interface CloudflareEnvEvent {
  context: { cloudflare?: { env?: Record<string, unknown> } }
}

export function getDb(event: CloudflareEnvEvent): D1Database | null {
  const env = event.context.cloudflare?.env
  const db = env?.DB as D1Database | undefined
  return db && typeof db.prepare === 'function' ? db : null
}
