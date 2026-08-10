import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

/**
 * Guard for pages. Every page that reads artifact data calls this, so a route
 * added later is protected by the code that reads the data rather than by a
 * pattern someone has to remember to update.
 */
export async function requireUser() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  return userId
}
