import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Everything is private by default. The only unauthenticated surfaces are the
 * sign-in flow itself and the public artifact route, which does its own
 * per-artifact visibility check.
 */
const isPublic = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/p/(.*)', // explicitly-published artifacts
  '/api/artifacts', // guards itself: Clerk session OR CLI token
  '/__clerk/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublic(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for Clerk's auto-proxy path
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
}
