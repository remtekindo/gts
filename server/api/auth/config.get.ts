/**
 * GET /api/auth/config — public Google Sign-In config for the client.
 *
 * Returns the Glots OAuth Client ID the browser needs to initialize
 * Google Identity Services. The Client ID is public by design (it is
 * also visible in the OAuth client settings and in page source), so
 * this endpoint needs no auth. Serving it from the server (instead of
 * baking it into the client bundle at build time) means the Client ID
 * can be set or rotated in Cloudflare Pages without a rebuild.
 */
export default defineEventHandler((event) => {
  const pub = useRuntimeConfig(event).public as Record<string, unknown>
  return { clientId: (pub.googleClientId as string) || null }
})
