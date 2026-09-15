'use client'

import { useMemo, useState } from 'react'
import type { PaperOption } from '@/app/tutor/students/[student_id]/lesson-actions'

function uniq(v: string[]) {
  return [...new Set(v.filter(Boolean))]
}

function ChipRow({
  label,
  options,
  selected,
  onSelect,
  sort,
}: {
  label: string
  options: string[]
  selected: string | null
  onSelect: (v: string | null) => void
  sort?: (a: string, b: string) => number
}) {
  const list = sort ? [...options].sort(sort) : [...options].sort()
  if (list.length === 0) return null

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] text-neutral-400 w-12 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {list.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSelect(selected === o ? null : o)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition ${selected === o
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
              }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PaperPicker({
  options,
  selected,
  onChange,
  suggestedIds = [],
}: {
  options: PaperOption[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Papers this student has worked on recently - offered as quick picks. */
  suggestedIds?: string[]
}) {
  const [qual, setQual] = useState<string | null>(null)
  const [board, setBoard] = useState<string | null>(null)
  const [spec, setSpec] = useState<string | null>(null)
  const [module, setModule] = useState<string | null>(null)

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])

  const quals = useMemo(() => uniq(options.map((o) => o.qual)), [options])

  const boards = useMemo(
    () => uniq(options.filter((o) => o.qual === qual).map((o) => o.board)),
    [options, qual]
  )

  const specs = useMemo(
    () =>
      uniq(
        options
          .filter((o) => o.qual === qual && o.board === board)
          .map((o) => o.spec)
      ),
    [options, qual, board]
  )

  const modules = useMemo(
    () =>
      uniq(
        options
          .filter((o) => o.qual === qual && o.board === board && o.spec === spec)
          .map((o) => o.module)
      ),
    [options, qual, board, spec]
  )

  const years = useMemo(
    () =>
      options
        .filter(
          (o) =>
            o.qual === qual &&
            o.board === board &&
            o.spec === spec &&
            o.module === module
        )
        .sort((a, b) => b.year.localeCompare(a.year, undefined, { numeric: true })),
    [options, qual, board, spec, module]
  )

  const suggestions = useMemo(
    () =>
      suggestedIds
        .filter((id) => !selected.includes(id))
        .map((id) => byId.get(id))
        .filter((o): o is PaperOption => !!o)
        .slice(0, 5),
    [suggestedIds, selected, byId]
  )

  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    )

  return (
    <div className="rounded-xl border border-neutral-200/80 p-3 space-y-2">
      {suggestions.length > 0 && (
        <div className="flex items-baseline gap-2 pb-2 border-b border-neutral-100">
          <span className="text-[11px] text-neutral-400 w-12 shrink-0">Recent</span>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-neutral-200 text-neutral-600 hover:border-neutral-400 transition"
              >
                {o.label}
                <span className="text-neutral-300 ml-1">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <ChipRow
        label="Level"
        options={quals}
        selected={qual}
        onSelect={(v) => {
          setQual(v)
          setBoard(null)
          setSpec(null)
          setModule(null)
        }}
      />

      {qual && (
        <ChipRow
          label="Board"
          options={boards}
          selected={board}
          onSelect={(v) => {
            setBoard(v)
            setSpec(null)
            setModule(null)
          }}
        />
      )}

      {qual && board && (
        <ChipRow
          label="Spec"
          options={specs}
          selected={spec}
          onSelect={(v) => {
            setSpec(v)
            setModule(null)
          }}
          sort={(a, b) => (a === 'New spec' ? -1 : b === 'New spec' ? 1 : 0)}
        />
      )}

      {board && spec && (
        <ChipRow
          label="Module"
          options={modules}
          selected={module}
          onSelect={setModule}
          sort={(a, b) => a.localeCompare(b, undefined, { numeric: true })}
        />
      )}

      {board && spec && module && (
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-neutral-400 w-12 shrink-0">Year</span>
          <div className="flex flex-wrap gap-1">
            {years.length === 0 ? (
              <span className="text-[11px] text-neutral-300">No papers here.</span>
            ) : (
              years.map((o) => {
                const on = selected.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full border transition ${on
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                      }`}
                  >
                    {o.year}
                    {on && <span className="ml-1">✓</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-2 border-t border-neutral-100">
          {selected.map((id) => {
            const o = byId.get(id)
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 text-white"
              >
                {o?.label ?? id}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="text-neutral-400 hover:text-white transition"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}