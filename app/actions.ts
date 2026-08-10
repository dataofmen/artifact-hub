'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { deleteArtifact, setVisibility, type Visibility } from '@/lib/artifacts'

async function requireUser() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
}

export async function updateVisibility(slug: string, visibility: Visibility) {
  await requireUser()
  await setVisibility(slug, visibility)
  revalidatePath('/')
  revalidatePath(`/a/${slug}`)
}

export async function removeArtifact(slug: string) {
  await requireUser()
  await deleteArtifact(slug)
  revalidatePath('/')
}
