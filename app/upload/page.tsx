'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadPage() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setWarnings([])

    const response = await fetch('/api/artifacts', {
      method: 'POST',
      body: new FormData(event.currentTarget),
    })
    const json = await response.json()
    setBusy(false)

    if (!response.ok) {
      setError(json.error ?? '업로드에 실패했습니다.')
      return
    }
    if (json.warnings?.length) {
      setWarnings(json.warnings)
      return
    }
    router.push(`/a/${json.artifact.slug}`)
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">아티팩트 올리기</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        단일 HTML 파일. 기본은 <strong>비공개</strong>이며 로그인 없이는 열리지
        않습니다.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="파일">
          <input
            type="file"
            name="file"
            accept=".html,.htm"
            required
            className="w-full text-sm"
          />
        </Field>
        <Field label="제목" hint="비우면 HTML의 <title>에서 가져옵니다">
          <input name="title" className={inputClass} />
        </Field>
        <Field label="설명" hint="선택">
          <textarea name="description" rows={2} className={inputClass} />
        </Field>
        <Field label="태그" hint="쉼표로 구분 (예: 대시보드, 개인)">
          <input name="tags" className={inputClass} />
        </Field>
        <Field label="슬러그" hint="비우면 파일명에서 자동 생성">
          <input name="slug" className={inputClass} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {warnings.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
            <p className="font-medium">민감정보로 보이는 내용이 있습니다</p>
            <ul className="mt-1 list-inside list-disc text-xs">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              업로드는 완료됐고 비공개 상태입니다. 공개로 바꾸기 전에 확인하세요.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? '올리는 중…' : '올리기'}
        </button>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {hint && (
          <span className="ms-2 font-normal text-zinc-400">{hint}</span>
        )}
      </span>
      {children}
    </label>
  )
}
