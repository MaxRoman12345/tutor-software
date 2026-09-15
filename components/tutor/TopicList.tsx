'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  TopicStats,
  DifficultyStats,
  CompletedQuestion,
} from '@/app/student/dashboard/actions'
import {
  setTopicAssessment,
  type TopicAssessment,
} from '@/app/tutor/students/[student_id]/assessment-actions'
import type { Lesson } from '@/app/tutor/students/[student_id]/lesson-actions'
import { ChevronIcon } from '@/components/students/materials/icons'
import { PaperLink } from '@/components/students/materials/PaperLink'
import { sectionLabel, sectionOrder } from '@/lib/sections'
const DIFF_LABEL: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' }
const DIFF_DOT: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-red-500',
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

/** Five dots filled up to `rank` (1-5); muted dash when unranked. */
function RankDots({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-[11px] text-neutral-300 shrink-0">– rank</span>
  return (
    <span className="flex items-center gap-0.5 shrink-0" title={`Strength ${rank}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= rank ? 'bg-neutral-900' : 'bg-neutral-200'}`}
        />
      ))}
    </span>
  )
}

/** Rank (1-5) + free-text note editor for one topic. */
function AssessmentEditor({
  current,
  onSaved,
}: {
  current: TopicAssessment
  onSaved: (a: TopicAssessment) => Promise<void>
}) {
  const [rank, setRank] = useState<number | null>(current.rank)
  const [note, setNote] = useState(current.note ?? '')
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const dirty = rank !== current.rank || note !== (current.note ?? '')

  const save = () => {
    setDone(false)
    startTransition(async () => {
      await onSaved({ rank, note: note.trim() || null })
      setDone(true)
    })
  }

  return (
    <div className="rounded-lg border border-neutral-200/80 bg-white p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] text-neutral-500">Strength</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRank(rank === n ? null : n)}
              className={`h-6 w-6 rounded-full text-[11px] font-mono border transition ${rank === n
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
        {rank && (
          <button
            type="button"
            onClick={() => setRank(null)}
            className="text-[11px] text-neutral-300 hover:text-red-500 transition"
          >
            clear
          </button>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setDone(false)
        }}
        rows={2}
        placeholder="Note on this topic (only you can see this)…"
        className="w-full rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs resize-y focus:outline-none focus:border-neutral-400"
      />

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="text-xs px-3 py-1 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {done && !dirty && (
          <span className="text-[11px] text-emerald-600">Saved</span>
        )}
      </div>
    </div>
  )
}

function hrs(mins: number | null) {
  if (!mins) return null
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Dense, tutor-facing version of the student's topic grid. */
export function TopicList({
  topics,
  assessments: initialAssessments,
  lessons,
  studentId,
}: {
  topics: TopicStats[]
  assessments: Record<string, TopicAssessment>
  lessons: Lesson[]
  studentId: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [assessments, setAssessments] = useState(initialAssessments)

  // topicId -> lessons that covered it, with the minutes spent on this topic
  const lessonsByTopic = useMemo(() => {
    const map = new Map<string, { lesson: Lesson; minutes: number | null }[]>()
    for (const l of lessons) {
      for (const t of l.topics) {
        if (!map.has(t.topicId)) map.set(t.topicId, [])
        map.get(t.topicId)!.push({ lesson: l, minutes: t.minutes })
      }
    }
    return map
  }, [lessons])

  if (topics.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 p-8 text-center">
        <p className="text-sm text-neutral-400">No questions in this programme yet.</p>
      </div>
    )
  }

  const grouped = new Map<string, TopicStats[]>()
  for (const t of topics) {
    const s = sectionLabel(t.section_course)
    if (!grouped.has(s)) grouped.set(s, [])
    grouped.get(s)!.push(t)
  }
  const ordered = [...grouped.entries()].sort(
    (a, b) => sectionOrder(a[0]) - sectionOrder(b[0])
  )

  return (
    <div className="space-y-3">
      {ordered.map(([section, list]) => (
        <div key={section}>
          <p className="text-xs text-neutral-400 mb-1.5">{section}</p>
          <div className="rounded-xl border border-neutral-200/80 divide-y divide-neutral-100">
            {list.map((t) => {
              const total =
                t.difficulty[1].total + t.difficulty[2].total + t.difficulty[3].total
              const att =
                attempted(t.difficulty[1]) +
                attempted(t.difficulty[2]) +
                attempted(t.difficulty[3])
              const correct =
                t.difficulty[1].correct +
                t.difficulty[2].correct +
                t.difficulty[3].correct
              const partial =
                t.difficulty[1].partial +
                t.difficulty[2].partial +
                t.difficulty[3].partial
              const incorrect =
                t.difficulty[1].incorrect +
                t.difficulty[2].incorrect +
                t.difficulty[3].incorrect
              const open = openId === t.id
              const assessment = assessments[t.id] ?? { rank: null, note: null }
              const topicLessons = lessonsByTopic.get(t.id) ?? []

              return (
                <div key={t.id}>
                  <button
                    onClick={() => setOpenId(open ? null : t.id)}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-3 hover:bg-neutral-50 transition"
                  >
                    <span className="flex gap-0.5 shrink-0">
                      {([1, 2, 3] as const).map((d) => {
                        const a = attempted(t.difficulty[d])
                        const tot = t.difficulty[d].total
                        return (
                          <span
                            key={d}
                            className={`h-1.5 w-1.5 rounded-full ${tot > 0 && a === tot
                              ? DIFF_DOT[d]
                              : a > 0
                                ? `${DIFF_DOT[d]} opacity-40`
                                : 'bg-neutral-200'
                              }`}
                            title={`${DIFF_LABEL[d]}: ${a}/${tot}`}
                          />
                        )
                      })}
                    </span>

                    <span className="text-xs text-neutral-700 flex-1 min-w-0 truncate">
                      {t.topic}
                    </span>

                    <RankDots rank={assessment.rank} />

                    <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                      <span className="text-emerald-600 w-4 text-right">{correct}</span>
                      <span className="text-amber-600 w-4 text-right">{partial}</span>
                      <span className="text-red-500 w-4 text-right">{incorrect}</span>
                    </span>

                    <span className="text-[11px] font-mono text-neutral-400 w-12 text-right shrink-0">
                      {att}/{total}
                    </span>

                    <ChevronIcon open={open} />
                  </button>

                  {open && (
                    <div className="px-3 pb-3 pt-1 bg-neutral-50/50 space-y-3">
                      <AssessmentEditor
                        current={assessment}
                        onSaved={async (a) => {
                          setAssessments((prev) => ({ ...prev, [t.id]: a }))
                          const res = await setTopicAssessment(studentId, t.id, a)
                          if (res.error) console.error(res.error)
                        }}
                      />

                      {/* Questions on this topic */}
                      <div className="space-y-2">
                        {([1, 2, 3] as const).map((d) => {
                          const stats = t.difficulty[d]
                          if (stats.total === 0) return null
                          return (
                            <div key={d}>
                              <p className="text-[11px] text-neutral-400 mb-0.5">
                                {DIFF_LABEL[d]} · {attempted(stats)}/{stats.total}
                              </p>
                              {stats.papers.map((p) => (
                                <div key={p.id} className="text-[11px] text-neutral-600">
                                  <PaperLink
                                    label={p.label}
                                    qpPath={p.qpPath}
                                    msPath={p.msPath}
                                    className="text-neutral-500"
                                  />
                                  {p.completed.length > 0 && (
                                    <span className="ml-2">
                                      {p.completed.map((q: CompletedQuestion, i) => (
                                        <span
                                          key={q.number}
                                          className={`font-mono ${OUTCOME_COLOR[q.outcome]}`}
                                        >
                                          {i > 0 && (
                                            <span className="text-neutral-300">, </span>
                                          )}
                                          Q{q.number}
                                          {OUTCOME_ICON[q.outcome]}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                  {p.unattempted.length > 0 && (
                                    <span className="ml-2 text-neutral-300">
                                      left:{' '}
                                      <span className="font-mono">
                                        Q{p.unattempted.join(', Q')}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>

                      {/* Lessons that covered this topic */}
                      {topicLessons.length > 0 && (
                        <div>
                          <p className="text-[11px] text-neutral-400 mb-1">Lessons</p>
                          <div className="space-y-1">
                            {topicLessons.map(({ lesson, minutes }) => (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-2 text-[11px] text-neutral-600"
                              >
                                <span className="font-medium text-neutral-700">
                                  {lesson.dateLabel}
                                </span>
                                {hrs(minutes) && (
                                  <span className="font-mono text-neutral-400">
                                    {hrs(minutes)}
                                  </span>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {lesson.papers.map((p) => (
                                    <span key={p.ppId} className="text-neutral-500">
                                      <PaperLink
                                        label={p.label}
                                        qpPath={p.qpPath}
                                        msPath={p.msPath}
                                      />
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
