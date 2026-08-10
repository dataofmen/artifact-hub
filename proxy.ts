import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Only attaches Clerk's auth context. Authorization happens at each resource
 * (`lib/require-user.ts`) rather than by path matching here -- Clerk deprecated
 * `createRouteMatcher` precisely because a matcher can diverge from how Next
 * actually routes a request and leave a protected resource reachable.
 */
export default clerkMiddleware()

export const config = {
  /**
   * Runs on everything except Next's own build output.
   *
   * Deliberately does NOT skip asset-looking paths. A request for a file that
   * does not exist (`/favicon.png`, `/style.css`) is routed to the not-found
   * page, which renders the root layout -- and that layout calls `auth()`.
   * Excluding those extensions left Clerk uninitialised there, so every such
   * 404 crashed with "auth() was called but Clerk can't detect usage of
   * clerkMiddleware()".
   */
  matcher: ['/((?!_next/static|_next/image).*)', '/__clerk/:path*'],
}
