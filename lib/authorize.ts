import { auth } from '@clerk/nextjs/server'

/**
 * The ingest API is reachable two ways: a signed-in browser session, or the
 * CLI with a shared token (no Clerk session exists in a shell).
 *
 * The token is compared in constant time so a wrong guess leaks no timing
 * information, and an unset HUB_TOKEN disables the CLI path entirely rather
 * than accepting everything.
 */
export async function authorizeRequest(request: Request): Promise<boolean> {
  const { userId } = await auth()
  if (userId) return true

  const expected = process.env.HUB_TOKEN
  const provided = request.headers.get('x-hub-token')
  if (!expected || !provided) return false
  if (expected.length !== provided.length) return false

  let mismatch = 0
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  }
  return mismatch === 0
}
