'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'

// NOTE: this Next.js version passes `retry` (not `reset`) to error boundaries.
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="py-6">
      <ErrorState message={error.message} onRetry={retry} />
    </div>
  )
}
