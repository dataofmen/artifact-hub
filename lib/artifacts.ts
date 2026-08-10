import { put, del, get } from '@vercel/blob'
import { getSql } from './db'
import { titleFromHtml, titleFromSlug } from './ingest'

/** neon() returns a union of result shapes; every query here selects rows. */
function rows<T>(result: unknown): T[] {
  return result as T[]
}

export type Visibility = 'private' | 'public'

export type Artifact = {
  id: string
  slug: string
  title: string
  description: string | null
  kind: string
  tags: string[]
  visibility: Visibility
  blob_pathname: string
  size_bytes: number
  version: number
  source: string | null
  created_at: string
  updated_at: string
}

export type ListOptions = {
  search?: string
  tag?: string
  visibility?: Visibility
}

export async function listArtifacts({
  search,
  tag,
  visibility,
}: ListOptions = {}): Promise<Artifact[]> {
  const sql = getSql()
  const result = await sql`
    select * from artifacts
    where (${search ?? null}::text is null
           or title ilike '%' || ${search} || '%'
           or coalesce(description, '') ilike '%' || ${search} || '%')
      and (${tag ?? null}::text is null or ${tag} = any (tags))
      and (${visibility ?? null}::text is null or visibility = ${visibility})
    order by created_at desc
  `
  return rows<Artifact>(result)
}

export async function getArtifact(slug: string): Promise<Artifact | null> {
  const sql = getSql()
  const result = await sql`select * from artifacts where slug = ${slug} limit 1`
  return rows<Artifact>(result)[0] ?? null
}

export async function allTags(): Promise<{ tag: string; count: number }[]> {
  const sql = getSql()
  const result = await sql`
    select unnest(tags) as tag, count(*)::int as count
    from artifacts group by 1 order by 2 desc, 1
  `
  return rows<{ tag: string; count: number }>(result)
}

type SaveInput = {
  slug: string
  /** Derived from the file's <title>, else the slug, when not supplied. */
  title?: string | null
  description?: string | null
  kind?: string
  tags?: string[]
  visibility?: Visibility
  source?: string | null
  body: Buffer | string
  contentType?: string
}

/**
 * Store the file in the private Blob store and upsert its metadata.
 * Re-saving an existing slug bumps the version and archives the previous file
 * rather than overwriting it.
 */
export async function saveArtifact(input: SaveInput): Promise<Artifact> {
  const sql = getSql()
  const existing = await getArtifact(input.slug)
  const version = existing ? existing.version + 1 : 1

  // Guaranteed here rather than at each call site: a row with no title is a
  // NOT NULL violation, and every caller has the same sensible fallbacks.
  const source = typeof input.body === 'string' ? input.body : input.body.toString('utf8')
  const title =
    input.title?.trim() ||
    titleFromHtml(source) ||
    existing?.title ||
    titleFromSlug(input.slug)

  // `addRandomSuffix: false` keeps the pathname predictable per version.
  const blob = await put(
    `artifacts/${input.slug}/v${version}.html`,
    input.body,
    {
      access: 'private',
      contentType: input.contentType ?? 'text/html; charset=utf-8',
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  )

  const size =
    typeof input.body === 'string'
      ? Buffer.byteLength(input.body)
      : input.body.byteLength

  if (existing) {
    await sql`
      insert into artifact_versions (artifact_id, version, blob_pathname, size_bytes)
      values (${existing.id}, ${existing.version}, ${existing.blob_pathname}, ${existing.size_bytes})
      on conflict (artifact_id, version) do nothing
    `
  }

  const result = await sql`
    insert into artifacts (slug, title, description, kind, tags, visibility, blob_pathname, size_bytes, version, source)
    values (${input.slug}, ${title}, ${input.description ?? null},
            ${input.kind ?? 'html'}, ${input.tags ?? []}, ${input.visibility ?? 'private'},
            ${blob.pathname}, ${size}, ${version}, ${input.source ?? null})
    on conflict (slug) do update set
      title         = excluded.title,
      description   = coalesce(excluded.description, artifacts.description),
      kind          = excluded.kind,
      tags          = case when cardinality(excluded.tags) > 0 then excluded.tags else artifacts.tags end,
      visibility    = excluded.visibility,
      blob_pathname = excluded.blob_pathname,
      size_bytes    = excluded.size_bytes,
      version       = excluded.version,
      source        = coalesce(excluded.source, artifacts.source),
      updated_at    = now()
    returning *
  `
  return rows<Artifact>(result)[0]
}

export async function deleteArtifact(slug: string): Promise<void> {
  const sql = getSql()
  const artifact = await getArtifact(slug)
  if (!artifact) return

  const versions = rows<{ blob_pathname: string }>(
    await sql`select blob_pathname from artifact_versions where artifact_id = ${artifact.id}`
  )

  await Promise.allSettled(
    [artifact.blob_pathname, ...versions.map((v) => v.blob_pathname)].map((p) =>
      del(p)
    )
  )
  await sql`delete from artifacts where id = ${artifact.id}`
}

export async function setVisibility(slug: string, visibility: Visibility) {
  const sql = getSql()
  await sql`
    update artifacts set visibility = ${visibility}, updated_at = now()
    where slug = ${slug}
  `
}

/** Read an artifact's file out of the private Blob store. */
export async function readArtifactBody(artifact: Artifact) {
  return get(artifact.blob_pathname, { access: 'private' })
}
