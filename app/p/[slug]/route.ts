import { getArtifact, readArtifactBody } from '@/lib/artifacts'

/**
 * Public read-only surface. Only artifacts explicitly marked `public` resolve
 * here; a private one 404s so this route cannot be used to probe for them.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const artifact = await getArtifact(slug)
  if (!artifact || artifact.visibility !== 'public') {
    return new Response('Not found', { status: 404 })
  }

  const blob = await readArtifactBody(artifact)
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return new Response('Blob missing', { status: 502 })
  }

  return new Response(blob.stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
