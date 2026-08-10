import { neon } from '@neondatabase/serverless'

/**
 * Lazy so that `next build` does not crash before Neon is provisioned --
 * `neon()` throws at call time when DATABASE_URL is missing, and Next evaluates
 * top-level module code during the build.
 */
let client: ReturnType<typeof neon> | null = null

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error(
        'DATABASE_URL is not set. Run `vercel integration add neon` and `vercel env pull`.'
      )
    }
    client = neon(url)
  }
  return client
}

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL)
