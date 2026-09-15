'use client'

import { useState } from 'react'
import type { TopicStats, DifficultyStats, CompletedQuestion } from '@/app/student/dashboard/actions'
import { PaperLink } from '@/components/students/materials/PaperLink'
import { sectionLabel, sectionOrder } from '@/lib/sections'

const DIFF_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_DOT: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-red-500',
}
const DIFF_TEXT: Record<number, string> = {
  1: 'text-emerald-700',
  2: 'text-amber-700',
  3: 'text-red-700',
}
const DIFF_BG: Record<number, string> = {
  1: 'bg-emerald-50',
  2: 'bg-amber-50',
  3: 'bg-red-50',
}
const OUTCOME_ICON: Record<string, string> = {
  correct: '✓',
  partial: '~',
  incorrect: '✗',
}
const OUTCOME_COLOR: Record<string, string> = {
  correct: 'text-emerald-600',
  partial: 'text-amber-600',
  incorrect: 'text-red-500',
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function attempted(d: DifficultyStats) {
  return d.correct + d.partial + d.incorrect
}

function topicPct(t: TopicStats) {
  const total =
    t.difficulty[1].total + t.difficulty[2].total + t.difficulty[3].total
  const att =
    attempted(t.difficulty[1]) +
    attempted(t.difficulty[2]) +
    attempted(t.difficulty[3])
  return pct(att, total)
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SmallChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-3.5 w-3.5 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function OverallRing({ pct }: { pct: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      className="shrink-0 -rotate-90"
    >
      <circle cx="28" cy="28" r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="#10b981"
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TopicCoverageGrid({ topics }: { topics: TopicStats[] }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null)

  const grouped = new Map<string, TopicStats[]>()
  for (const t of topics) {
    const label = sectionLabel(t.section_course)
    if (!grouped.has(label)) grouped.set(label, [])
    grouped.get(label)!.push(t)
  }
  const sections = [...grouped.entries()].sort(
    (a, b) => sectionOrder(a[0]) - sectionOrder(b[0]),
  )

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 p-10 text-center">
        <p className="text-sm text-neutral-400">
          No questions found for this programme yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sections.map(([section, sectionTopics]) => {
        if (sectionTopics.length === 0) return null
        return (
          <section key={section}>
            <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
              {section}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sectionTopics.map((t) => (
                <TopicCard
                  key={t.id}
                  topic={t}
                  open={openTopic === t.id}
                  onToggle={() =>
                    setOpenTopic(openTopic === t.id ? null : t.id)
                  }
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TopicCard({
  topic: t,
  open,
  onToggle,
}: {
  topic: TopicStats
  open: boolean
  onToggle: () => void
}) {
  const [openDiff, setOpenDiff] = useState<number | null>(null)
  const overall = topicPct(t)

  return (
    <div
      className={`rounded-2xl border transition ${open ? 'border-neutral-300' : 'border-neutral-200/80'
        }`}
    >
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3"
      >
        <div className="flex flex-col gap-1 shrink-0">
          {([1, 2, 3] as const).map((d) => {
            const att = attempted(t.difficulty[d])
            const total = t.difficulty[d].total
            const done = total > 0 && att === total
            const started = att > 0 && att < total
            return (
              <span
                key={d}
                className={`h-2 w-2 rounded-full transition ${done
                  ? DIFF_DOT[d]
                  : started
                    ? `${DIFF_DOT[d]} opacity-40`
                    : 'bg-neutral-200'
                  }`}
                title={`${DIFF_LABEL[d]}: ${att}/${total}`}
              />
            )
          })}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 truncate">
            {t.topic}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full bg-neutral-400 rounded-full"
                style={{ width: `${overall}%` }}
              />
            </div>
            <span className="text-xs font-mono text-neutral-400 shrink-0">
              {overall}%
            </span>
          </div>
        </div>

        <Chevron open={open} />
      </button>

      {open && (
        <div className="border-t border-neutral-100 divide-y divide-neutral-100">
          {([1, 2, 3] as const).map((d) => {
            const stats = t.difficulty[d]
            if (stats.total === 0) return null
            const att = attempted(stats)
            const diffOpen = openDiff === d

            return (
              <div key={d}>
                <button
                  onClick={() => setOpenDiff(diffOpen ? null : d)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition"
                >
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${DIFF_BG[d]} ${DIFF_TEXT[d]}`}
                  >
                    {DIFF_LABEL[d]}
                  </span>

                  <div className="flex-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="flex h-full">
                      {stats.correct > 0 && (
                        <div
                          className="bg-emerald-500"
                          style={{
                            width: `${pct(stats.correct, stats.total)}%`,
                          }}
                        />
                      )}
                      {stats.partial > 0 && (
                        <div
                          className="bg-amber-500"
                          style={{
                            width: `${pct(stats.partial, stats.total)}%`,
                          }}
                        />
                      )}
                      {stats.incorrect > 0 && (
                        <div
                          className="bg-red-500"
                          style={{
                            width: `${pct(stats.incorrect, stats.total)}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-mono text-neutral-400 shrink-0">
                    {att}/{stats.total}
                  </span>

                  <SmallChevron open={diffOpen} />
                </button>

                {diffOpen && (
                  <div className="px-4 pb-4 pt-2 space-y-4">
                    {stats.papers.map((p) => {
                      const hasCompleted = p.completed.length > 0
                      const hasLeft = p.unattempted.length > 0

                      return (
                        <div key={p.id} className="text-xs text-neutral-600">
                          <PaperLink
                            label={p.label}
                            qpPath={p.qpPath}
                            msPath={p.msPath}
                            className="font-medium text-neutral-700"
                          />

                          {hasCompleted && (
                            <span className="ml-2">
                              <span className="text-neutral-400">done: </span>
                              {p.completed.map(
                                (q: CompletedQuestion, i: number) => (
                                  <span
                                    key={q.number}
                                    className={`font-mono ${OUTCOME_COLOR[q.outcome]}`}
                                  >
                                    {i > 0 && (
                                      <span className="text-neutral-300">
                                        ,{' '}
                                      </span>
                                    )}
                                    Q{q.number}
                                    {OUTCOME_ICON[q.outcome]}
                                  </span>
                                )
                              )}
                            </span>
                          )}

                          {hasLeft && (
                            <span className="ml-2 text-neutral-400">
                              left:{' '}
                              <span className="font-mono text-neutral-500">
                                Q{p.unattempted.join(', Q')}
                              </span>
                            </span>
                          )}
                        </div>
                      )
                    })}

                    {stats.papers.length === 0 && (
                      <p className="text-xs text-neutral-400">
                        No papers at this difficulty level yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}