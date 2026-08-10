'use client'

import { useState, useTransition } from 'react'
import { updateVisibility } from '@/app/actions'
import type { Visibility } from '@/lib/artifacts'

export function VisibilityToggle({
  slug,
  visibility,
}: {
  slug: string
  visibility: Visibility
}) {
  const [current, setCurrent] = useState(visibility)
  const [pending, startTransition] = useTransition()

  const isPublic = current === 'public'

  function toggle() {
    const next: Visibility = isPublic ? 'private' : 'public'
    if (
      next === 'public' &&
      !confirm(
        '이 아티팩트를 공개합니다.\n로그인 없이 /p/' +
          slug +
          ' 로 누구나 볼 수 있게 됩니다. 계속할까요?'
      )
    ) {
      return
    }
    setCurrent(next)
    startTransition(() => updateVisibility(slug, next))
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          isPublic
            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
            : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
        }`}
      >
        {isPublic ? '공개' : '비공개'}
      </span>
      <button
        onClick={toggle}
        disabled={pending}
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        {isPublic ? '비공개로' : '공개로'}
      </button>
    </div>
  )
}
