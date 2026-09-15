import { Progress, pctComplete, isComplete } from './types'

export function FilterRow({
  label,
  hint,
  options,
  selected,
  onSelect,
  format,
  progressFor,
  inProgramme,
}: {
  label: string
  /** Small note beside the label, e.g. which board is the student's own. */
  hint?: string
  options: string[]
  selected: string | null
  onSelect: (v: string) => void
  format?: (v: string) => string
  progressFor?: (v: string) => Progress
  /**
   * Marks which options belong to the student's own programme. Anything
   * outside it is dampened so their own board stands out, but stays fully
   * clickable — every board is still browsable.
   */
  inProgramme?: (v: string) => boolean
}) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-2">
        {label}
        {hint && <span className="text-neutral-300 ml-2">{hint}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 ? (
          <span className="text-sm text-neutral-300">None available</span>
        ) : (
          options.map((o) => {
            const prog = progressFor?.(o)
            const active = selected === o
            const complete = prog ? isComplete(prog) : false
            const outside = inProgramme ? !inProgramme(o) : false

            return (
              <button
                key={o}
                onClick={() => onSelect(o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition ${active
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : outside
                      ? 'border-neutral-100 text-neutral-300 hover:border-neutral-300 hover:text-neutral-600'
                      : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                  }`}
              >
                <span>{format ? format(o) : o}</span>
                {prog && prog.total > 0 && (
                  <span
                    className={`text-xs font-mono ${active
                        ? 'text-neutral-400'
                        : outside
                          ? 'text-neutral-200'
                          : complete
                            ? 'text-emerald-600'
                            : 'text-neutral-400'
                      }`}
                  >
                    {complete ? '✓' : `${pctComplete(prog)}%`}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
