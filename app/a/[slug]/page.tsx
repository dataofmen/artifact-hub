import { notFound } from 'next/navigation'
import { getArtifact } from '@/lib/artifacts'
import { VisibilityToggle } from './visibility-toggle'

export default async function ArtifactPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const artifact = await getArtifact(slug)
  if (!artifact) notFound()

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {artifact.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            v{artifact.version} · {(artifact.size_bytes / 1024).toFixed(0)}KB ·{' '}
            {new Date(artifact.created_at).toLocaleDateString('ko-KR')}
            {artifact.tags.length > 0 && ` · ${artifact.tags.join(', ')}`}
          </p>
        </div>
        <VisibilityToggle slug={artifact.slug} visibility={artifact.visibility} />
      </div>

      <iframe
        src={`/a/${artifact.slug}/raw`}
        title={artifact.title}
        className="flex-1 w-full rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
        sandbox="allow-scripts allow-popups allow-forms"
      />
    </div>
  )
}
