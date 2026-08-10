import { auth } from '@clerk/nextjs/server'
import { getArtifact, readArtifactBody } from '@/lib/artifacts'

/**
 * Serves an artifact's HTML from private Blob storage.
 *
 * This is the whole point of the architecture: the file never exists as a
 * build asset on the CDN, so there is no URL that bypasses this check.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const artifact = await getArtifact(slug)
  if (!artifact) return new Response('Not found', { status: 404 })

  if (artifact.visibility === 'private') {
    const { userId } = await auth()
    if (!userId) return new Response('Unauthorized', { status: 401 })
  }

  const blob = await readArtifactBody(artifact)
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return new Response('Blob missing', { status: 502 })
  }

  return new Response(blob.stream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Never let a shared cache hold a private artifact.
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  })
}
