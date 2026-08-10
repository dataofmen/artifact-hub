#!/usr/bin/env node
/**
 * Push an artifact straight from the shell -- the path Claude Code uses.
 *
 *   pnpm hub:add ~/Downloads/dashboard.html
 *   pnpm hub:add ~/Downloads/*.html --tags 대시보드,개인
 *   pnpm hub:add x.html --title '제목' --slug my-slug --source 0017
 *
 * Requires HUB_URL and HUB_TOKEN (a Clerk session is not available here, so the
 * API accepts a shared token for CLI ingestion).
 */
import { readFileSync, existsSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}

const argv = process.argv.slice(2)
const files = []
const opts = {}
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  // `--local` is a boolean flag; every other option consumes the next argument.
  if (a === '--local') opts.local = true
  else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i]
  else files.push(a)
}

if (!files.length) {
  console.error(`Usage: pnpm hub:add <파일...> [옵션]

옵션:
  --title T         제목 (비우면 HTML <title>)
  --slug S          URL 슬러그 (비우면 파일명에서 생성)
  --tags a,b        쉼표 구분 태그
  --description D   설명
  --source S        출처 메모
  --local           프로덕션 대신 로컬 dev 서버로 (기본은 프로덕션)`)
  process.exit(1)
}

// Production by default: uploading to the deployed hub is the common case.
// `--local` (or HUB_URL) targets a dev server instead.
const base = opts.url
  || (opts.local !== undefined ? 'http://localhost:3019' : null)
  || process.env.HUB_URL
  || 'https://artifact-hub-virid.vercel.app'
const token = process.env.HUB_TOKEN
if (!token) {
  console.error('HUB_TOKEN이 설정되지 않았습니다. .env.local과 Vercel 환경변수에 추가하세요.')
  process.exit(1)
}

if (files.length > 1 && (opts.slug || opts.title)) {
  console.error('--slug/--title은 파일 하나일 때만 사용합니다.')
  process.exit(1)
}

for (const file of files) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) {
    console.error(`없는 파일: ${file}`)
    process.exit(1)
  }
  const res = await fetch(`${base}/api/artifacts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Token': token },
    body: JSON.stringify({
      filename: basename(path),
      body: readFileSync(path, 'utf8'),
      ...opts,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`✗ ${basename(path)}: ${json.error ?? res.status}`)
    process.exit(1)
  }
  console.log(`✓ ${json.artifact.title}`)
  console.log(`    ${base}/a/${json.artifact.slug}  (v${json.artifact.version}, 비공개)`)
  if (json.warnings?.length) {
    console.log(`    ⚠️  민감정보 의심: ${json.warnings.join(', ')}`)
  }
}
