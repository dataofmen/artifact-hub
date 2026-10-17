---
name: artifact-hub-verify
description: >-
  Prove the artifact-hub admission boundary. Use when changing ArtifactIn,
  slug derivation, content types, or the Clerk matcher in proxy.ts.
---

# Artifact Hub verify

Run these from the repo root. They pass when the old inputs are rejected and the corrected boundary is accepted.

```bash
pnpm test
pnpm check:suffix-matcher
pnpm exec next typegen
pnpm exec tsc --noEmit --pretty false
```

`pnpm test` covers the runtime boundary:

- An omitted, null, or blank title is rejected (`title is required`). A non-empty title is admitted.
- `slugify('CLI 연결 테스트')` is `cli`, and that slug is rejected. `slugKeepingHangul` admits `cli-yeongyeol-teseuteu`. The same split rejects `2026` for `2026 매출 계획` and admits `2026-maechul-gyehoek`.
- A hosts-file body (`127.0.0.1 localhost`) with `text/html` is rejected. The same body with `text/plain` is admitted, and an HTML document with `text/html` is admitted.

`pnpm exec next typegen` writes `next-env.d.ts` (gitignored) so `LayoutProps` exists. `pnpm exec tsc --noEmit --pretty false` then typechecks `lib/artifact-in.test.ts`. These assignments are `@ts-expect-error`, so the command fails if they become legal:

- `ArtifactIn` with no `title`
- `slug: slugify('CLI 연결 테스트')` (Hangul dropped)
- a non-HTML body with `contentType: 'text/html'`

`pnpm check:suffix-matcher` reads `proxy.ts`. The old matcher skipped `.png` and `.css`. On that input the error names the fix: `Fix: run clerkMiddleware on asset-looking paths so a missing asset 404s instead of crashing`. The current matcher only excludes `_next/static` and `_next/image`, so the command prints `suffix-matcher: ok`.
