import { slugFromName, slugify } from './ingest'

declare const hangulKept: unique symbol
/** Slug produced without dropping Hangul. `CLI 연결 테스트` stays `cli-yeongyeol-teseuteu`, not `cli`. */
export type HangulKeptSlug = string & { readonly [hangulKept]: true }

declare const htmlBodyBrand: unique symbol
export type HtmlBody = string & { readonly [htmlBodyBrand]: true }

declare const nonHtmlBodyBrand: unique symbol
export type NonHtmlBody = string & { readonly [nonHtmlBodyBrand]: true }

declare const nonHtmlTypeBrand: unique symbol
/** A content type that is not `text/html`. */
export type NonHtmlContentType = string & { readonly [nonHtmlTypeBrand]: true }

export type HtmlContentType = 'text/html' | `text/html;${string}`

/**
 * Admission shape for an artifact.
 *
 * `title` is required — an omitted title was inserted as NULL.
 * `slug` keeps Hangul by romanising it.
 * `text/html` is paired only with an HTML body, so `/etc/hosts` cannot be stored as HTML.
 */
export type ArtifactIn = {
  title: string
  slug: HangulKeptSlug
} & (
  | { body: HtmlBody; contentType: HtmlContentType }
  | { body: NonHtmlBody; contentType: NonHtmlContentType }
)

export class ArtifactRejected extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ArtifactRejected'
  }
}

const HTML_DOCUMENT = /<!doctype\s+html\b|<html\b|<head\b|<body\b/i
const HTML_TYPE = /^text\/html\b/i

export function isHtmlBody(body: string): boolean {
  return HTML_DOCUMENT.test(body)
}

/** Romanise Hangul before slugifying. This is the boundary that replaced the drop. */
export function slugKeepingHangul(name: string): HangulKeptSlug {
  return slugFromName(name) as HangulKeptSlug
}

/**
 * The old derivation: slugify strips Hangul, so `CLI 연결 테스트` becomes `cli`
 * and `2026 매출 계획` becomes `2026`. Kept so the admission check can reject it.
 */
export function slugDroppingHangul(name: string): string {
  const stem = name.replace(/\.(html?|md|tsx?|jsx?)$/i, '')
  return slugify(stem) || 'artifact'
}

export function droppedHangul(name: string, slug: string): boolean {
  if (!/[가-힣]/.test(name)) return false
  const dropped = slugDroppingHangul(name)
  return slug === dropped && slug !== slugFromName(name)
}

export function requireTitle(title: string | null | undefined): string {
  const trimmed = title?.trim() ?? ''
  if (!trimmed) throw new ArtifactRejected('title is required')
  return trimmed
}

export function asHtmlBody(body: string): HtmlBody {
  if (!isHtmlBody(body)) {
    throw new ArtifactRejected('contentType cannot be text/html for a non-html body')
  }
  return body as HtmlBody
}

export function asNonHtmlBody(body: string): NonHtmlBody {
  if (isHtmlBody(body)) throw new ArtifactRejected('body is html')
  return body as NonHtmlBody
}

export function nonHtmlContentType(contentType: string): NonHtmlContentType {
  if (HTML_TYPE.test(contentType)) {
    throw new ArtifactRejected('contentType cannot be text/html for a non-html body')
  }
  return contentType as NonHtmlContentType
}

export function admitArtifact(input: {
  title?: string | null
  name: string
  slug?: string | null
  body: string
  contentType: string
}): ArtifactIn {
  const title = requireTitle(input.title)
  const kept = slugKeepingHangul(input.name)
  const slugText = input.slug?.trim() ? input.slug.trim() : kept
  if (droppedHangul(input.name, slugText)) {
    throw new ArtifactRejected(
      `slug dropped Hangul: ${JSON.stringify(input.name)} became ${JSON.stringify(slugText)}`
    )
  }
  const slug = (slugText === kept ? kept : slugText) as HangulKeptSlug

  if (isHtmlBody(input.body)) {
    if (!HTML_TYPE.test(input.contentType)) {
      throw new ArtifactRejected('an html body requires contentType text/html')
    }
    return {
      title,
      slug,
      body: input.body as HtmlBody,
      contentType: input.contentType as HtmlContentType,
    }
  }

  if (HTML_TYPE.test(input.contentType)) {
    throw new ArtifactRejected('contentType cannot be text/html for a non-html body')
  }

  return {
    title,
    slug,
    body: input.body as NonHtmlBody,
    contentType: input.contentType as NonHtmlContentType,
  }
}
