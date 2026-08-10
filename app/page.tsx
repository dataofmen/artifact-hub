import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { allTags, listArtifacts } from '@/lib/artifacts'
import { databaseConfigured } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>
}) {
  const { userId } = await auth()
  if (!userId) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Artifact Hub</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          로그인이 필요합니다.
        </p>
      </div>
    )
  }

  if (!databaseConfigured()) {
    return <SetupNotice />
  }

  const { q, tag } = await searchParams
  const [artifacts, tags] = await Promise.all([
    listArtifacts({ search: q, tag }),
    allTags(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">보관함</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {artifacts.length}개의 아티팩트
          </p>
        </div>
        <form className="flex gap-2" action="/">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="제목·설명 검색"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900">
            검색
          </button>
        </form>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/"
            className={`rounded-full border px-2.5 py-1 ${
              tag
                ? 'border-zinc-300 dark:border-zinc-700'
                : 'border-zinc-900 dark:border-zinc-100'
            }`}
          >
            전체
          </Link>
          {tags.map(({ tag: t, count }) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className={`rounded-full border px-2.5 py-1 ${
                tag === t
                  ? 'border-zinc-900 dark:border-zinc-100'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}
            >
              {t} <span className="text-zinc-400">{count}</span>
            </Link>
          ))}
        </div>
      )}

      {artifacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          아직 아티팩트가 없습니다.{' '}
          <Link href="/upload" className="underline">
            올리기
          </Link>{' '}
          또는 <code className="font-mono text-xs">pnpm hub:add &lt;파일&gt;</code>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {artifacts.map((artifact) => (
            <li key={artifact.id}>
              <Link
                href={`/a/${artifact.slug}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-snug">
                    {artifact.title}
                  </span>
                  {artifact.visibility === 'public' && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      공개
                    </span>
                  )}
                </div>
                {artifact.description && (
                  <p className="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {artifact.description}
                  </p>
                )}
                <p className="mt-auto text-xs text-zinc-400">
                  v{artifact.version} ·{' '}
                  {new Date(artifact.created_at).toLocaleDateString('ko-KR')}
                  {artifact.tags.length > 0 && ` · ${artifact.tags.join(', ')}`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="text-xl font-semibold tracking-tight">설정이 남았습니다</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Blob 스토어는 준비됐지만 데이터베이스가 아직 연결되지 않았습니다.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
        {`vercel integration add neon --name artifact-hub-db --no-claim
vercel env pull .env.local --yes
pnpm db:push`}
      </pre>
    </div>
  )
}
