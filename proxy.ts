import { clerkMiddleware } from '@clerk/nextjs/server'

/**
 * Only attaches Clerk's auth context. Authorization happens at each resource
 * (`lib/require-user.ts`) rather than by path matching here -- Clerk deprecated
 * `createRouteMatcher` precisely because a matcher can diverge from how Next
 * actually routes a request and leave a protected resource reachable.
 */
export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
