import { Dot } from './icons'

export function MarkingKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 mb-4 text-xs text-neutral-400">
      <span><Dot className="bg-emerald-500" />Correct - fully right</span>
      <span><Dot className="bg-amber-500" />Partially correct - worth redoing</span>
      <span><Dot className="bg-red-500" />Incorrect - not right</span>
      <span className="text-neutral-300">Tap a mark again to remove it</span>
    </div>
  )
}