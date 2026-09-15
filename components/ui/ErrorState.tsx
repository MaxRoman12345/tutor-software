'use client'

/**
 * Shared "something went wrong" panel. Used by route error boundaries
 * (error.tsx) and by client pages when a data fetch fails — so an error shows a
 * message + Retry instead of an endless loading state.
 */
export function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null
  onRetry?: () => void
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-sm font-medium text-red-700 mb-1">Something went wrong</p>
      <p className="text-xs text-red-500 mb-4 break-words">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm px-3 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition"
        >
          Try again
        </button>
      )}
    </div>
  )
}
