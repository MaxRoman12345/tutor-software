import { Progress } from './types'

export function CompletionBanner({ progress }: { progress: Progress }) {
  const toRevisit = progress.partial + progress.incorrect

  return (
    <div className="rounded-2xl bg-neutral-900 text-white p-5 mb-3 flex items-center gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <path
            d="M5 10.5l3.5 3.5L15 7"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="font-medium">Paper complete</p>
        <p className="text-sm text-neutral-400">
          All {progress.total} questions marked.{' '}
          {toRevisit > 0
            ? `${toRevisit} to revisit with your tutor.`
            : 'Nothing flagged to revisit.'}
        </p>
      </div>
    </div>
  )
}