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
// Node does not auto-load .env.local the way Next does. Missing is fine --
// a fresh clone has not run `vercel env pull` yet, and the checks below give a
// better message than an ENOENT stack trace.
try {
  for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {
  // no .env.local yet
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

// Where to upload. Never hardcode a deployment here -- this repo is meant to
// be cloned and deployed by whoever uses it.
const base =
  opts.url || (opts.local ? 'http://localhost:3000' : null) || process.env.HUB_URL

if (!base) {
  console.error(`HUB_URL이 설정되지 않았습니다.

배포한 허브 주소를 .env.local 에 추가하세요:
  HUB_URL=https://your-hub.vercel.app

로컬 개발 서버로 올리려면 --local, 다른 주소면 --url <URL> 을 씁니다.`)
  process.exit(1)
}

const token = process.env.HUB_TOKEN
if (!token) {
  console.error(`HUB_TOKEN이 설정되지 않았습니다.

임의의 문자열을 만들어 .env.local 과 Vercel 환경변수 양쪽에 넣으세요:
  echo "HUB_TOKEN=$(openssl rand -hex 32)" >> .env.local
  vercel env add HUB_TOKEN production`)
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
  // Only single-file HTML. Without this the hub happily stored anything piped
  // at it -- /etc/hosts became an artifact served as text/html.
  if (!/\.html?$/i.test(path)) {
    console.error(`HTML 파일만 올릴 수 있습니다: ${file}`)
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
