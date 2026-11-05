/**
 * User store (D1) — identity + privilege for Google sign-in.
 *
 * One row per Google account, keyed by Google `sub` (the stable account
 * id, never the email — emails can change). First sign-in creates the
 * row; later sign-ins refresh name/picture/last login. Privilege:
 * - `role` on the user row ('user' | 'admin') — set by an admin in
 *   Admin → Users (promote/demote). The env allowlist
 *   (NITRO_ADMIN_EMAILS) is the bootstrap admin and always wins,
 *   even if D1 is unreachable.
 * - `grants` rows: a material grant opens one material, a package
 *   grant opens the materials that package covers (see catalog.ts).
 *
 * Every function here is best-effort about a missing database: `db`
 * is null on a plain `pnpm dev` (no D1 binding — use
 * `wrangler pages dev --d1=DB` for the real store) and on any D1
 * error the caller keeps the user signed in with the env-allowlist
 * role and no grants, rather than breaking login. Admin-only writes
 * (role/grants) are different: they 503 when there is no database.
 */

import { getDb, type D1Database } from './d1'
import type { H3Event } from 'h3'
import { FREE_MATERIAL_SLUGS, OWNED_MATERIAL_SLUGS, isKnownMaterial, isKnownPackage, packageMaterials } from './catalog'
import type { GoogleIdentity } from './google-auth'

export interface RealUser {
  sub: string
  email: string
  name: string | null
  picture: string | null
  role: 'user' | 'admin'
  createdAt: string | null
  lastLoginAt: string | null
  /** True when the email is in the env allowlist — always an admin. */
  bootstrapAdmin: boolean
  /** Raw grants (what the admin set in Admin → Users). */
  grants: { materials: string[], packages: string[] }
  /** Effective access, resolved server-side (see resolveAccess). */
  access: { materials: string[], packages: string[] }
}

export interface UserGrants {
  materials: string[]
  packages: string[]
}

interface UserRow {
  google_sub: string
  username: string
  email: string | null
  name: string | null
  picture: string | null
  role: string
  created_at: string | null
  last_login_at: string | null
}

interface GrantRow {
  user_sub: string
  kind: string
  target: string
}

/** Create the user row on first sign-in; refresh identity on later ones. Never throws. */
export async function upsertUser(db: D1Database | null, identity: GoogleIdentity): Promise<void> {
  if (!db) return
  try {
    await db.prepare(
      `INSERT INTO users (username, google_sub, email, name, picture, role, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'user', datetime('now'))
       ON CONFLICT(google_sub) DO UPDATE SET
         username = excluded.username, email = excluded.email,
         name = excluded.name, picture = excluded.picture,
         last_login_at = datetime('now')`
    ).bind(identity.email, identity.sub, identity.email, identity.name ?? null, identity.picture ?? null).run()
  } catch (e) {
    console.warn('[user-store] upsert failed, continuing with an ephemeral identity:', (e as Error).message)
  }
}

export async function getUserRow(db: D1Database | null, sub: string): Promise<UserRow | null> {
  if (!db) return null
  try {
    return await db.prepare(
      'SELECT google_sub, username, email, name, picture, role, created_at, last_login_at FROM users WHERE google_sub = ?1'
    ).bind(sub).first<UserRow>()
  } catch (e) {
    console.warn('[user-store] user lookup failed:', (e as Error).message)
    return null
  }
}

export async function getGrants(db: D1Database | null, sub: string): Promise<UserGrants> {
  const empty: UserGrants = { materials: [], packages: [] }
  if (!db) return empty
  try {
    const res = await db.prepare('SELECT kind, target FROM grants WHERE user_sub = ?1').bind(sub).all<GrantRow>()
    const materials: string[] = []
    const packages: string[] = []
    for (const row of res.results || []) {
      if (row.kind === 'material' && isKnownMaterial(row.target)) materials.push(row.target)
      if (row.kind === 'package' && isKnownPackage(row.target)) packages.push(row.target)
    }
    return { materials, packages }
  } catch (e) {
    console.warn('[user-store] grant lookup failed:', (e as Error).message)
    return empty
  }
}

/**
 * Effective access for a signed-in user. Admins open everything.
 * Everyone else opens: free materials + granted materials + materials
 * covered by a granted package.
 */
export async function resolveAccess(
  db: D1Database | null,
  identity: { sub: string, email: string },
  bootstrapAdmin: boolean
): Promise<{ role: 'admin' | 'user', materials: string[], packages: string[] }> {
  const row = await getUserRow(db, identity.sub)
  const role: 'admin' | 'user' = bootstrapAdmin || row?.role === 'admin' ? 'admin' : 'user'
  if (role === 'admin') return { role, materials: [...OWNED_MATERIAL_SLUGS], packages: ['bulanan', 'triwulanan', 'semesteran'] }
  const grants = await getGrants(db, identity.sub)
  const materials = new Set<string>([...FREE_MATERIAL_SLUGS, ...grants.materials])
  for (const pkg of grants.packages) {
    for (const slug of packageMaterials(pkg)) materials.add(slug)
  }
  return { role, materials: [...materials], packages: grants.packages }
}

/** All real (Google sign-in) users, newest first, with their grants + effective access. */
export async function listRealUsers(db: D1Database, adminEmails: string[]): Promise<RealUser[]> {
  const rows = await db.prepare(
    'SELECT google_sub, username, email, name, picture, role, created_at, last_login_at FROM users WHERE google_sub IS NOT NULL ORDER BY created_at DESC'
  ).all<UserRow>()
  const grantRows = await db.prepare('SELECT user_sub, kind, target FROM grants').all<GrantRow>()
  const byUser = new Map<string, UserGrants>()
  for (const g of grantRows.results || []) {
    const cur = byUser.get(g.user_sub) ?? { materials: [], packages: [] }
    if (g.kind === 'material' && isKnownMaterial(g.target)) cur.materials.push(g.target)
    if (g.kind === 'package' && isKnownPackage(g.target)) cur.packages.push(g.target)
    byUser.set(g.user_sub, cur)
  }
  const users: RealUser[] = []
  for (const row of rows.results || []) {
    const email = row.email || row.username
    const bootstrapAdmin = adminEmails.includes(email.toLowerCase())
    const grants = byUser.get(row.google_sub) ?? { materials: [], packages: [] }
    const role: 'admin' | 'user' = bootstrapAdmin || row.role === 'admin' ? 'admin' : 'user'
    const materials = new Set<string>([...FREE_MATERIAL_SLUGS, ...grants.materials])
    if (role === 'admin') {
      for (const slug of OWNED_MATERIAL_SLUGS) materials.add(slug)
    } else {
      for (const pkg of grants.packages) {
        for (const slug of packageMaterials(pkg)) materials.add(slug)
      }
    }
    users.push({
      sub: row.google_sub,
      email,
      name: row.name,
      picture: row.picture,
      role,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      bootstrapAdmin,
      grants,
      access: { materials: [...materials], packages: role === 'admin' ? ['bulanan', 'triwulanan', 'semesteran'] : grants.packages }
    })
  }
  return users
}

/** Promote/demote a user. Returns false when the user does not exist. */
export async function setUserRole(db: D1Database, sub: string, role: 'admin' | 'user'): Promise<boolean> {
  const row = await getUserRow(db, sub)
  if (!row) return false
  await db.prepare('UPDATE users SET role = ?1 WHERE google_sub = ?2').bind(role, sub).run()
  return true
}

/** Replace a user's grants wholesale (validated against the catalog). */
export async function setGrants(db: D1Database, sub: string, grants: UserGrants, grantedBy: string | null): Promise<boolean> {
  const row = await getUserRow(db, sub)
  if (!row) return false
  const materials = [...new Set(grants.materials)].filter(isKnownMaterial)
  const packages = [...new Set(grants.packages)].filter(isKnownPackage)
  await db.prepare('DELETE FROM grants WHERE user_sub = ?1').bind(sub).run()
  for (const slug of materials) {
    await db.prepare(
      "INSERT INTO grants (user_sub, kind, target, granted_by) VALUES (?1, 'material', ?2, ?3)"
    ).bind(sub, slug, grantedBy).run()
  }
  for (const pkg of packages) {
    await db.prepare(
      "INSERT INTO grants (user_sub, kind, target, granted_by) VALUES (?1, 'package', ?2, ?3)"
    ).bind(sub, pkg, grantedBy).run()
  }
  return true
}

/** D1 binding for this request, or null (plain `pnpm dev` has none). */
export function getRequestDb(event: H3Event): D1Database | null {
  return getDb(event)
}
