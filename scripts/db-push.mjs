#!/usr/bin/env node
/** Apply lib/schema.sql to the provisioned Neon database. */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Node does not auto-load .env.local the way Next does.
for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Provision Neon, then `vercel env pull .env.local --yes`.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const ddl = readFileSync(resolve(root, 'lib/schema.sql'), 'utf8')

// neon() batches poorly on multi-statement strings; run them one at a time.
const statements = ddl
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter((s) => s && !s.startsWith('--'))

for (const statement of statements) {
  const label = statement.split('\n')[0].slice(0, 60)
  await sql.query(statement)
  console.log('✓', label)
}
console.log(`\n${statements.length}개 문장 적용 완료`)
