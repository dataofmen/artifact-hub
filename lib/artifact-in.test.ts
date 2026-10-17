import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  admitArtifact,
  asHtmlBody,
  asNonHtmlBody,
  droppedHangul,
  nonHtmlContentType,
  requireTitle,
  slugDroppingHangul,
  slugKeepingHangul,
  type ArtifactIn,
} from './artifact-in'
import { slugify } from './ingest'
import { SUFFIX_MATCHER_FIX, suffixMatcherProblem } from './suffix-matcher'

const HTML =
  '<!doctype html><html><head><title>CLI 연결 테스트</title></head><body></body></html>'
const HOSTS = '127.0.0.1 localhost\n::1 localhost ip6-localhost\n'

test('omitted title is rejected', () => {
  assert.throws(() => requireTitle(undefined), /title is required/)
  assert.throws(() => requireTitle(null), /title is required/)
  assert.throws(() => requireTitle('   '), /title is required/)
  assert.throws(
    () =>
      admitArtifact({
        name: 'note.html',
        body: HTML,
        contentType: 'text/html',
      }),
    /title is required/
  )
})

test('a provided title is the admitted title', () => {
  const admitted = admitArtifact({
    title: 'CLI 연결 테스트',
    name: 'CLI 연결 테스트.html',
    body: HTML,
    contentType: 'text/html',
  })
  assert.equal(admitted.title, 'CLI 연결 테스트')
})

test('slugify drops Hangul; the keeper romanises it', () => {
  assert.equal(slugify('CLI 연결 테스트'), 'cli')
  assert.equal(slugDroppingHangul('CLI 연결 테스트'), 'cli')
  assert.equal(slugKeepingHangul('CLI 연결 테스트'), 'cli-yeongyeol-teseuteu')
  assert.equal(slugify('2026 매출 계획'), '2026')
  assert.equal(slugDroppingHangul('2026 매출 계획'), '2026')
  assert.equal(slugKeepingHangul('2026 매출 계획'), '2026-maechul-gyehoek')
})

test('the dropped slug is rejected and the romanised slug is admitted', () => {
  assert.equal(droppedHangul('CLI 연결 테스트', 'cli'), true)
  assert.throws(
    () =>
      admitArtifact({
        title: 'CLI 연결 테스트',
        name: 'CLI 연결 테스트',
        slug: 'cli',
        body: HTML,
        contentType: 'text/html',
      }),
    /slug dropped Hangul: "CLI 연결 테스트" became "cli"/
  )
  assert.throws(
    () =>
      admitArtifact({
        title: '2026 매출 계획',
        name: '2026 매출 계획',
        slug: '2026',
        body: HTML,
        contentType: 'text/html',
      }),
    /became "2026"/
  )

  const admitted = admitArtifact({
    title: 'CLI 연결 테스트',
    name: 'CLI 연결 테스트.html',
    body: HTML,
    contentType: 'text/html',
  })
  assert.equal(admitted.slug, 'cli-yeongyeol-teseuteu')

  const explicit = admitArtifact({
    title: 'CLI 연결 테스트',
    name: 'CLI 연결 테스트',
    slug: 'cli-yeongyeol-teseuteu',
    body: HTML,
    contentType: 'text/html',
  })
  assert.equal(explicit.slug, 'cli-yeongyeol-teseuteu')
})

test('an ASCII name may keep a slug that matches the old slugify', () => {
  const admitted = admitArtifact({
    title: 'CLI',
    name: 'cli.html',
    slug: 'cli',
    body: HTML,
    contentType: 'text/html',
  })
  assert.equal(admitted.slug, 'cli')
})

test('/etc/hosts cannot be stored as text/html', () => {
  assert.throws(
    () =>
      admitArtifact({
        title: 'hosts',
        name: 'hosts',
        body: HOSTS,
        contentType: 'text/html',
      }),
    /contentType cannot be text\/html for a non-html body/
  )
  assert.throws(
    () =>
      admitArtifact({
        title: 'hosts',
        name: 'hosts',
        body: HOSTS,
        contentType: 'text/html; charset=utf-8',
      }),
    /contentType cannot be text\/html for a non-html body/
  )
  assert.throws(() => asHtmlBody(HOSTS), /contentType cannot be text\/html for a non-html body/)
  assert.throws(() => nonHtmlContentType('text/html'), /contentType cannot be text\/html for a non-html body/)
})

test('html is text/html and a hosts file is not', () => {
  const page = admitArtifact({
    title: 'CLI 연결 테스트',
    name: 'CLI 연결 테스트.html',
    body: HTML,
    contentType: 'text/html; charset=utf-8',
  })
  assert.equal(page.contentType, 'text/html; charset=utf-8')

  const hosts = admitArtifact({
    title: 'hosts',
    name: 'hosts',
    body: HOSTS,
    contentType: 'text/plain',
  })
  assert.equal(hosts.contentType, 'text/plain')
  assert.equal(hosts.body, HOSTS)
})

test('ArtifactIn rejects the old inputs at the type boundary', () => {
  const kept = slugKeepingHangul('CLI 연결 테스트.html')
  const html = asHtmlBody(HTML)
  const hosts = asNonHtmlBody(HOSTS)
  const plain = nonHtmlContentType('text/plain')

  const titled: ArtifactIn = {
    title: 'CLI 연결 테스트',
    slug: kept,
    body: html,
    contentType: 'text/html',
  }
  const hostsFile: ArtifactIn = {
    title: 'hosts',
    slug: slugKeepingHangul('hosts'),
    body: hosts,
    contentType: plain,
  }
  assert.equal(titled.title, 'CLI 연결 테스트')
  assert.equal(hostsFile.contentType, 'text/plain')

  // @ts-expect-error omitted title is not an ArtifactIn (it was inserted as NULL)
  const omittedTitle: ArtifactIn = { slug: kept, body: html, contentType: 'text/html' }
  // @ts-expect-error slugify drops Hangul, so "CLI 연결 테스트" becomes "cli"
  const droppedSlug: ArtifactIn = { title: 'CLI 연결 테스트', slug: slugify('CLI 연결 테스트'), body: html, contentType: 'text/html' }
  // @ts-expect-error contentType cannot be text/html for a non-html body
  const hostsAsHtml: ArtifactIn = { title: 'hosts', slug: slugKeepingHangul('hosts'), body: hosts, contentType: 'text/html' }
  assert.ok(omittedTitle || droppedSlug || hostsAsHtml)
})

test('the suffix-matcher check names the fix and passes the current matcher', () => {
  const oldMatcher = String.raw`
    export const config = {
      matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/__clerk/:path*',
        '/(api|trpc)(.*)',
      ],
    }
  `
  const problem = suffixMatcherProblem(oldMatcher)
  assert.ok(problem)
  assert.match(problem, /suffixes \(\.png\/\.css\)/)
  assert.match(problem, new RegExp(SUFFIX_MATCHER_FIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  const current = suffixMatcherProblem(readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8'))
  assert.equal(current, null)
})
