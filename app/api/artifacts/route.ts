import { authorizeRequest } from '@/lib/authorize'
import { listArtifacts, saveArtifact } from '@/lib/artifacts'
import {
  scanForSensitiveData,
  slugFromName,
  slugify,
  titleFromHtml,
  titleFromSlug,
} from '@/lib/ingest'

export async function GET(request: Request) {
  if (!(await authorizeRequest(request)))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const artifacts = await listArtifacts({
    search: url.searchParams.get('q') ?? undefined,
    tag: url.searchParams.get('tag') ?? undefined,
  })
  return Response.json({ artifacts })
}

/**
 * Ingest an artifact. Accepts multipart (browser upload) or JSON (CLI).
 * Everything lands as `private` unless explicitly published.
 */
export async function POST(request: Request) {
  if (!(await authorizeRequest(request)))
    return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: string
  let filename: string
  let fields: Record<string, string> = {}

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return Response.json({ error: 'file is required' }, { status: 400 })
    }
    body = await file.text()
    filename = file.name
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string') fields[key] = value
    }
  } else {
    const json = await request.json()
    if (!json?.body || !json?.filename) {
      return Response.json(
        { error: 'body and filename are required' },
        { status: 400 }
      )
    }
    body = json.body
    filename = json.filename
    fields = json
  }

  const slug = fields.slug ? slugify(fields.slug) : slugFromName(filename)
  const title =
    fields.title?.trim() ||
    titleFromHtml(body) ||
    titleFromSlug(slug)

  const tags = (fields.tags ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const artifact = await saveArtifact({
    slug,
    title,
    description: fields.description || null,
    kind: fields.kind || 'html',
    tags,
    visibility: fields.visibility === 'public' ? 'public' : 'private',
    source: fields.source || null,
    body,
  })

  return Response.json({
    artifact,
    // Advisory only -- ingestion is never blocked on it.
    warnings: scanForSensitiveData(body),
  })
}
