import { Progress } from './types'

export function SegmentBar({ progress, thin }: { progress: Progress; thin?: boolean }) {
  const { total, correct, partial, incorrect } = progress
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  return (
    <div className={`flex rounded-full overflow-hidden bg-neutral-100 ${thin ? 'h-1' : 'h-2'}`}>
      {correct > 0 && (
        <div className="bg-emerald-500" style={{ width: `${pct(correct)}%` }} />
      )}
      {partial > 0 && (
        <div className="bg-amber-500" style={{ width: `${pct(partial)}%` }} />
      )}
      {incorrect > 0 && (
        <div className="bg-red-500" style={{ width: `${pct(incorrect)}%` }} />
      )}
    </div>
  )
}