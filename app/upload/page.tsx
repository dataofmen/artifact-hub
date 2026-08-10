import { requireUser } from '@/lib/require-user'
import { UploadForm } from './upload-form'

export default async function UploadPage() {
  await requireUser()
  return <UploadForm />
}
