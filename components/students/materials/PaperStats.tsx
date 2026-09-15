import { Progress, markedCount, pctComplete } from './types'
import { SegmentBar } from './SegmentBar'
import { Dot } from './icons'

export function PaperStats({ progress }: { progress: Progress }) {
  const { total, correct, partial, incorrect } = progress
  const marked = markedCount(progress)

  return (
    <div className="rounded-2xl border border-neutral-200/80 p-5 mb-3">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-medium">{pctComplete(progress)}% complete</span>
        <span className="text-xs font-mono text-neutral-400">{marked}/{total} marked</span>
      </div>
      <SegmentBar progress={progress} />
      {marked > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-neutral-500">
          <span><Dot className="bg-emerald-500" />{correct} correct</span>
          <span><Dot className="bg-amber-500" />{partial} partially correct</span>
          <span><Dot className="bg-red-500" />{incorrect} incorrect</span>
        </div>
      )}
    </div>
  )
}