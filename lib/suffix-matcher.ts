/**
 * The clerk matcher used to skip paths ending in .png/.css. A missing file is
 * still routed at the not-found page, which calls auth(), so the skip crashed.
 */
export const SUFFIX_MATCHER_FIX =
  'Fix: run clerkMiddleware on asset-looking paths so a missing asset 404s instead of crashing'

const ASSET_SUFFIX_SKIP = /\\+\.\(\?:[^)\n]*\b(?:png|css)\b/

export function suffixMatcherProblem(source: string): string | null {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '')
  if (!ASSET_SUFFIX_SKIP.test(code)) return null
  return `suffix-matcher: auth matched path suffixes (.png/.css), so a missing asset crashed. ${SUFFIX_MATCHER_FIX}. Only exclude _next/static and _next/image.`
}
