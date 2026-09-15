'use client'

import { useState, useTransition } from 'react'
import {
  setQuestionOutcome,
  clearQuestionOutcome,
  setQuestionNote,
  type Outcome,
  type QuestionRow,
} from '@/app/student/materials/actions'
import { NoteText } from '@/components/ui/NoteText'
import { tabIndents } from '@/lib/textarea'

const OUTCOMES: { key: Outcome; label: string; short: string; active: string }[] = [
  { key: 'incorrect', label: 'Incorrect', short: 'Incorrect', active: 'bg-red-500 text-white border-red-500' },
  { key: 'partial', label: 'Partially correct', short: 'Partial', active: 'bg-amber-500 text-white border-amber-500' },
  { key: 'correct', label: 'Correct', short: 'Correct', active: 'bg-emerald-500 text-white border-emerald-500' },
]

function Difficulty({ level }: { level: number | null }) {
  if (level == null) return <span className="text-xs text-neutral-300 w-16 text-right">-</span>
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

function NoteButton({ hasNote, open, onClick }: { hasNote: boolean; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={hasNote ? 'Edit note' : 'Add note'}
      className={`flex h-6 w-6 items-center justify-center rounded-full border transition mr-1 ${hasNote || open
        ? 'border-neutral-900 bg-neutral-900 text-white'
        : 'border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600'
        }`}
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
        <path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

function OutcomeButtons({ current, onMark }: { current: Outcome | null; onMark: (o: Outcome) => void }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {OUTCOMES.map((o) => (
        <button
          key={o.key}
          onClick={() => onMark(o.key)}
          title={current === o.key ? 'Click again to unmark' : o.label}
          className={`px-2 sm:px-2.5 py-1 rounded-full text-xs border transition ${current === o.key
            ? o.active
            : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
            }`}
        >
          <span className="lg:hidden">{o.short}</span>
          <span className="hidden lg:inline">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function QuestionRowItem({
  question: q,
  onMark,
  onNoteChange,
}: {
  question: QuestionRow
  onMark: (id: string, outcome: Outcome | null) => void
  onNoteChange: (id: string, note: string | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState(q.note ?? '')

  const handleMark = (outcome: Outcome) => {
    const isUnmarking = q.outcome === outcome
    onMark(q.id, isUnmarking ? null : outcome)
    startTransition(async () => {
      const res = isUnmarking
        ? await clearQuestionOutcome(q.id)
        : await setQuestionOutcome(q.id, outcome)
      if (res.error) console.error('Failed to save outcome:', res.error)
    })
  }

  const saveNote = () => {
    const trimmed = draft.trim()
    if (trimmed === (q.note ?? '')) return
    onNoteChange(q.id, trimmed || null)
    startTransition(async () => {
      const res = await setQuestionNote(q.id, trimmed)
      if (res.error) console.error('Failed to save note:', res.error)
    })
  }

  return (
    <div
      className={`px-4 sm:px-5 py-3 sm:py-3.5 border-t border-neutral-100 hover:bg-neutral-50 transition ${pending ? 'opacity-60' : ''
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 sm:flex-1">
          <span className="font-mono text-sm text-neutral-900 w-8 sm:w-12 shrink-0">
            {q.question_number ?? '-'}
          </span>
          <span className="text-sm text-neutral-700 truncate">
            {q.topics?.topic ?? 'Untagged'}
          </span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
          <div className="flex items-center gap-1 shrink-0">
            <NoteButton
              hasNote={!!q.note}
              open={noteOpen}
              onClick={() => { setDraft(q.note ?? ''); setNoteOpen((o) => !o) }}
            />
            <OutcomeButtons current={q.outcome} onMark={handleMark} />
          </div>
          <Difficulty level={q.difficulty} />
        </div>
      </div>

      {!noteOpen && q.note && (
        <div className="text-xs text-neutral-500 mt-2 pl-11 sm:pl-16">
          <NoteText text={q.note} />
        </div>
      )}

      {noteOpen && (
        <div className="mt-3 pl-11 sm:pl-16">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={tabIndents(draft, setDraft)}
            onBlur={saveNote}
            placeholder="Add a note - what went wrong, what to review…"
            rows={2}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-y focus:outline-none focus:border-neutral-400"
          />
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => { saveNote(); setNoteOpen(false) }}
              className="text-xs text-neutral-600 hover:text-neutral-900 transition"
            >
              Done
            </button>
            {q.note && (
              <button
                onClick={() => {
                  setDraft('')
                  onNoteChange(q.id, null)
                  startTransition(async () => { await setQuestionNote(q.id, '') })
                  setNoteOpen(false)
                }}
                className="text-xs text-neutral-400 hover:text-red-500 transition"
              >
                Delete note
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}