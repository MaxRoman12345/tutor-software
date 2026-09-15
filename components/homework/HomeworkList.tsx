'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteHomework,
  setHomeworkComplete,
  type HomeworkItem,
} from '@/app/tutor/students/[student_id]/homework-actions'
import {
  getQuestionsForPaper,
  type Outcome,
  type QuestionRow,
} from '@/app/student/materials/actions'
import { SegmentBar } from '@/components/students/materials/SegmentBar'
import { PaperLink } from '@/components/students/materials/PaperLink'
import { homeworkPdfUrl } from '@/components/students/materials/types'
import { NoteText } from '@/components/ui/NoteText'
import { QuestionTableHeader } from '@/components/students/materials/QuestionTableHeader'
import { QuestionRowItem } from '@/components/students/materials/QuestionRowItem'
import { ChevronIcon } from '@/components/students/materials/icons'

const OUTCOME_PILL: Record<string, string> = {
  correct: 'bg-emerald-500 text-white',
  partial: 'bg-amber-500 text-white',
  incorrect: 'bg-red-500 text-white',
}
const OUTCOME_LABEL: Record<string, string> = {
  correct: 'Correct',
  partial: 'Partial',
  incorrect: 'Incorrect',
}

async function downloadPdf(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function Difficulty({ level }: { level: number | null }) {
  if (level == null) return <span className="text-xs text-neutral-300 w-16 text-right shrink-0">-</span>
  const colours = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500']
  return (
    <span className="flex items-center gap-1 w-16 justify-end shrink-0" title={`Difficulty ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i <= level ? colours[level - 1] : 'bg-neutral-200'}`}
        />
      ))}
    </span>
  )
}

/** Read-only row for the tutor's view - marking belongs to the student only. */
function ReadOnlyQuestionRow({ question: q }: { question: QuestionRow }) {
  return (
    <div className="flex items-center gap-4 px-4 sm:px-5 py-3 sm:py-3.5 border-t border-neutral-100">
      <span className="font-mono text-sm text-neutral-900 w-8 sm:w-12 shrink-0">
        {q.question_number ?? '-'}
      </span>
      <span className="text-sm text-neutral-700 truncate flex-1 min-w-0">
        {q.topics?.topic ?? 'Untagged'}
      </span>
      {q.outcome && (
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${OUTCOME_PILL[q.outcome]}`}
        >
          {OUTCOME_LABEL[q.outcome]}
        </span>
      )}
      <Difficulty level={q.difficulty} />
    </div>
  )
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function dueLabel(h: HomeworkItem) {
  if (h.daysUntilDue === null) return null
  if (h.status === 'complete') return `due ${h.dueLabel}`
  if (h.daysUntilDue < 0) {
    const d = Math.abs(h.daysUntilDue)
    return `${d}d overdue`
  }
  if (h.daysUntilDue === 0) return 'due today'
  if (h.daysUntilDue === 1) return 'due tomorrow'
  return `due in ${h.daysUntilDue}d`
}

const STATUS_STYLE: Record<HomeworkItem['status'], string> = {
  complete: 'bg-emerald-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  not_started: 'bg-neutral-200 text-neutral-600',
}
const STATUS_LABEL: Record<HomeworkItem['status'], string> = {
  complete: 'Done',
  in_progress: 'Started',
  not_started: 'Not started',
}

export function HomeworkList({
  homework,
  studentId,
  canDelete = false,
  readOnly = false,
}: {
  homework: HomeworkItem[]
  studentId: string
  canDelete?: boolean
  /** Admin view: no delete, no marking, no complete toggle — display only. */
  readOnly?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [questionsByPaper, setQuestionsByPaper] = useState<Record<string, QuestionRow[]>>({})
  const [loadingPapers, setLoadingPapers] = useState<Set<string>>(new Set())
  // Optimistic manual-completion overrides, keyed by homework id.
  const [manualDone, setManualDone] = useState<Record<string, boolean>>({})

  // Whether a homework counts as manually complete right now (optimistic state
  // wins over the server value it was seeded from).
  const isDone = (h: HomeworkItem) => manualDone[h.id] ?? h.completed

  const toggleComplete = (h: HomeworkItem) => {
    const next = !isDone(h)
    setManualDone((prev) => ({ ...prev, [h.id]: next }))
    startTransition(async () => {
      const res = await setHomeworkComplete(h.id, next)
      if (res.error) {
        setManualDone((prev) => ({ ...prev, [h.id]: !next }))
        console.error(res.error)
      } else {
        router.refresh()
      }
    })
  }

  if (homework.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 p-8 text-center">
        <p className="text-sm text-neutral-400">No homework set yet - Set homework when logging a lesson.</p>
      </div>
    )
  }

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteHomework(id, studentId)
      if (res.error) console.error(res.error)
      else router.refresh()
    })
  }

  const toggleExpand = (h: HomeworkItem) => {
    const opening = expandedId !== h.id
    setExpandedId(opening ? h.id : null)

    if (opening) {
      const toLoad = h.papers.filter((p) => !(p.ppId in questionsByPaper))
      if (toLoad.length > 0) {
        setLoadingPapers((prev) => new Set([...prev, ...toLoad.map((p) => p.ppId)]))
        toLoad.forEach((p) => {
          const load = getQuestionsForPaper(p.ppId, studentId)
          load.then((rows) => {
            setQuestionsByPaper((prev) => ({ ...prev, [p.ppId]: rows }))
            setLoadingPapers((prev) => {
              const next = new Set(prev)
              next.delete(p.ppId)
              return next
            })
          })
        })
      }
    } else {
      // resync the summary cards (Set/Completed/Overdue/Accuracy) now that
      // marks made while expanded may have changed them.
      router.refresh()
    }
  }

  const markQuestion = (ppId: string, questionId: string, outcome: Outcome | null) => {
    setQuestionsByPaper((prev) => ({
      ...prev,
      [ppId]: (prev[ppId] ?? []).map((q) => (q.id === questionId ? { ...q, outcome } : q)),
    }))
  }

  const noteChanged = (ppId: string, questionId: string, note: string | null) => {
    setQuestionsByPaper((prev) => ({
      ...prev,
      [ppId]: (prev[ppId] ?? []).map((q) => (q.id === questionId ? { ...q, note } : q)),
    }))
  }

  /**
   * Server counts are a snapshot from page load, so marking inside the
   * expanded view wouldn't move the bar. Once every attached paper is loaded
   * we hold the homework's full question set, so recount from that instead.
   */
  const liveProgress = (h: HomeworkItem) => {
    const loaded = h.papers.map((p) => questionsByPaper[p.ppId])
    if (h.papers.length === 0 || loaded.some((rows) => !rows)) return null

    const rows = loaded.flat() as QuestionRow[]
    const count = (o: Outcome) => rows.filter((q) => q.outcome === o).length

    return {
      total: rows.length,
      correct: count('correct'),
      partial: count('partial'),
      incorrect: count('incorrect'),
    }
  }

  const complete = homework.filter((h) => isDone(h)).length
  const overdue = homework.filter((h) => h.overdue && !isDone(h)).length
  const totCorrect = homework.reduce((a, h) => a + h.correct, 0)
  const totMarked = homework.reduce((a, h) => a + h.marked, 0)

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Set</p>
          <p className="text-xl font-semibold font-mono">{homework.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Completed</p>
          <p className="text-xl font-semibold font-mono">
            {complete}
            <span className="text-xs text-neutral-300">/{homework.length}</span>
          </p>
        </div>
        <div
          className={`rounded-2xl border px-4 py-2.5 flex-1 ${overdue > 0 ? 'border-red-200 bg-red-50' : 'border-neutral-200/80'
            }`}
        >
          <p className={`text-xs ${overdue > 0 ? 'text-red-600' : 'text-neutral-500'}`}>
            Overdue
          </p>
          <p
            className={`text-xl font-semibold font-mono ${overdue > 0 ? 'text-red-600' : ''}`}
          >
            {overdue}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Accuracy</p>
          <p className="text-xl font-semibold font-mono">
            {totMarked > 0 ? `${pct(totCorrect, totMarked)}%` : '-'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100">
        {homework.map((h) => {
          const due = dueLabel(h)
          const open = expandedId === h.id
          const live = liveProgress(h)
          const bar = live ?? {
            total: h.total,
            correct: h.correct,
            partial: h.partial,
            incorrect: h.incorrect,
          }
          const marked = bar.correct + bar.partial + bar.incorrect
          const done = isDone(h)
          // Completion is the student's tick alone; the marks are informational.
          const status: HomeworkItem['status'] = done
            ? 'complete'
            : marked > 0
              ? 'in_progress'
              : 'not_started'
          return (
            <div
              key={h.id}
              onClick={() => toggleExpand(h)}
              className={`px-4 py-3 cursor-pointer hover:bg-neutral-50/80 transition ${pending ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2.5 flex-wrap gap-y-1.5">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[status]}`}
                >
                  {STATUS_LABEL[status]}
                </span>
                <span className="text-sm font-medium text-neutral-900 truncate min-w-0 max-w-full">
                  {h.title}
                </span>
                <span className="text-[11px] font-mono text-neutral-300 shrink-0">
                  set {h.assignedLabel}
                </span>
                <div className="flex-1 min-w-0" />
                {due && (
                  <span
                    className={`text-[11px] font-mono shrink-0 ${h.overdue ? 'text-red-500' : 'text-neutral-400'
                      }`}
                  >
                    {due}
                  </span>
                )}
                {canDelete && !readOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(h.id)
                    }}
                    className="text-[11px] text-neutral-300 hover:text-red-500 transition shrink-0"
                  >
                    Delete
                  </button>
                )}
                <ChevronIcon open={open} />
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap gap-y-2">
                {bar.total > 0 && (
                  <>
                    <div className="flex-1 min-w-[8rem] max-w-sm">
                      <SegmentBar progress={bar} thin />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      {marked}/{bar.total}
                    </span>
                    {marked > 0 && (
                      <span className="text-[11px] font-mono text-neutral-300 shrink-0">
                        {pct(bar.correct, marked)}% correct
                      </span>
                    )}
                  </>
                )}
                {canDelete || readOnly ? (
                  done && (
                    <span className="text-[11px] text-emerald-600 shrink-0">
                      ✓ Marked done by student
                    </span>
                  )
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleComplete(h)
                    }}
                    disabled={pending}
                    className={`text-[11px] px-3 py-1 rounded-full border transition disabled:opacity-50 shrink-0 ${done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300'
                      : 'border-neutral-300 text-neutral-700 hover:border-neutral-500'
                      }`}
                  >
                    {done ? '✓ Completed — undo' : 'Mark as complete'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {h.papers.map((p) => (
                  <span
                    key={p.ppId}
                    className="text-[11px] px-1.5 py-0.5 rounded-full border border-neutral-200 text-neutral-500"
                  >
                    <PaperLink label={p.label} qpPath={p.qpPath} msPath={p.msPath} />
                  </span>
                ))}
                {h.files.map((f) => {
                  const url = homeworkPdfUrl(f.path)
                  if (!url) return null
                  return (
                    <span
                      key={f.path}
                      className="text-[11px] px-1.5 py-0.5 rounded-full border border-neutral-200 text-neutral-500 inline-flex items-center gap-1.5"
                      title={f.name}
                    >
                      <span aria-hidden>📄</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(url, '_blank')
                        }}
                        className="max-w-[12rem] truncate hover:text-neutral-900 hover:underline transition"
                      >
                        {f.name}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadPdf(url, f.name)
                        }}
                        className="text-neutral-400 hover:text-neutral-900 transition"
                        title="Download"
                      >
                        ↓
                      </button>
                    </span>
                  )
                })}
              </div>

              {h.notes && (
                <div className="text-[11px] text-neutral-500 mt-1.5 border-l-2 border-neutral-200 pl-2">
                  <NoteText text={h.notes} />
                </div>
              )}

              {open && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 pt-3 border-t border-neutral-100 space-y-4 cursor-auto"
                >
                  {h.papers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-2">
                      No materials attached to this homework.
                    </p>
                  ) : (
                    h.papers.map((p) => {
                      const rows = questionsByPaper[p.ppId]
                      const paperLoading = loadingPapers.has(p.ppId)
                      return (
                        <div key={p.ppId}>
                          <PaperLink
                            label={p.label}
                            qpPath={p.qpPath}
                            msPath={p.msPath}
                            className="text-xs font-medium text-neutral-700"
                          />
                          <div className="mt-2 rounded-xl border border-neutral-200/80 overflow-hidden">
                            {paperLoading || !rows ? (
                              <p className="text-xs text-neutral-400 py-4 text-center">
                                Loading questions…
                              </p>
                            ) : rows.length === 0 ? (
                              <p className="text-xs text-neutral-400 py-4 text-center">
                                No questions logged for this paper yet.
                              </p>
                            ) : (
                              <>
                                <QuestionTableHeader />
                                {rows.map((q) =>
                                  canDelete || readOnly ? (
                                    <ReadOnlyQuestionRow key={q.id} question={q} />
                                  ) : (
                                    <QuestionRowItem
                                      key={q.id}
                                      question={q}
                                      onMark={(id, outcome) => markQuestion(p.ppId, id, outcome)}
                                      onNoteChange={(id, note) => noteChanged(p.ppId, id, note)}
                                    />
                                  )
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-[11px] text-neutral-300 px-1">
        Progress updates automatically as questions are marked in Materials.
      </p>
    </div>
  )
}