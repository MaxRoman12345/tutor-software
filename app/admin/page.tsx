'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  getAdminData,
  assignStudentToTutor,
  unassignStudent,
  setStudentExamBoard,
  type AdminData,
  type AdminStudent,
  type AdminTutor,
} from './actions'
import { EXAM_BOARDS } from '@/lib/exam-board'
import { ErrorState } from '@/components/ui/ErrorState'

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Tutor filter: 'all', 'unassigned', or a tutor id.
  const [filter, setFilter] = useState<string>('all')
  // Unsaved dropdown edits, keyed by student id — only persisted on Save.
  const [edits, setEdits] = useState<
    Record<string, { examBoard?: string | null; tutorId?: string | null }>
  >({})

  const load = useCallback(() => {
    getAdminData()
      .then((d) => setData(d))
      .catch((e) => setError(e?.message ?? 'Failed to load admin data.'))
      .finally(() => setLoading(false))
  }, [])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    load()
  }, [load])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <p className="text-sm text-neutral-400 py-12 text-center">Loading…</p>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  if (!data) return null

  const tutorCounts = new Map<string, number>()
  for (const s of data.students) {
    if (s.tutor) tutorCounts.set(s.tutor.id, (tutorCounts.get(s.tutor.id) ?? 0) + 1)
  }

  // Current dropdown values: an unsaved edit wins over the stored value.
  const boardOf = (s: AdminStudent) => {
    const e = edits[s.id]
    return e && 'examBoard' in e ? e.examBoard ?? '' : s.exam_board ?? ''
  }
  const tutorOf = (s: AdminStudent) => {
    const e = edits[s.id]
    return e && 'tutorId' in e ? e.tutorId ?? '' : s.tutor?.id ?? ''
  }
  const rowDirty = (s: AdminStudent) => {
    const e = edits[s.id]
    if (!e) return false
    const boardChanged =
      'examBoard' in e && (e.examBoard ?? null) !== (s.exam_board ?? null)
    const tutorChanged =
      'tutorId' in e && (e.tutorId ?? null) !== (s.tutor?.id ?? null)
    return boardChanged || tutorChanged
  }

  const setBoardEdit = (id: string, board: string | null) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], examBoard: board } }))
  const setTutorEdit = (id: string, tutorId: string | null) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], tutorId } }))

  const dirtyStudents = data.students.filter(rowDirty)

  const discard = () => setEdits({})

  const saveAll = async () => {
    setSaving(true)
    for (const s of dirtyStudents) {
      const e = edits[s.id]!
      if ('examBoard' in e && (e.examBoard ?? null) !== (s.exam_board ?? null)) {
        const { error } = await setStudentExamBoard(s.id, e.examBoard ?? null)
        if (error) console.error(error)
      }
      if ('tutorId' in e && (e.tutorId ?? null) !== (s.tutor?.id ?? null)) {
        const tutorId = e.tutorId ?? null
        const { error } = tutorId
          ? await assignStudentToTutor(s.id, tutorId)
          : await unassignStudent(s.id)
        if (error) console.error(error)
      }
    }
    setEdits({})
    setSaving(false)
    load() // refetch so the UI reflects exactly what's stored
  }

  const shownStudents = data.students.filter((s) =>
    filter === 'all'
      ? true
      : filter === 'unassigned'
        ? !s.tutor
        : s.tutor?.id === filter
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Students &amp; tutors</h1>
        </div>
        <div className="flex gap-3 text-xs font-mono text-neutral-400 shrink-0">
          <span>{data.students.length} students</span>
          <span>·</span>
          <span>{data.tutors.length} tutors</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <FilterChip
          label="All students"
          count={data.students.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label="Unassigned"
          count={data.students.filter((s) => !s.tutor).length}
          active={filter === 'unassigned'}
          onClick={() => setFilter('unassigned')}
        />
        {data.tutors.map((t) => (
          <FilterChip
            key={t.id}
            label={t.name ?? t.email ?? 'Tutor'}
            count={tutorCounts.get(t.id) ?? 0}
            active={filter === t.id}
            onClick={() => setFilter(t.id)}
          />
        ))}
      </div>

      {dirtyStudents.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
          <span className="text-xs text-amber-800">
            {dirtyStudents.length} unsaved change
            {dirtyStudents.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={discard}
              disabled={saving}
              className="text-xs text-neutral-500 hover:text-neutral-900 transition disabled:opacity-50"
            >
              Discard
            </button>
            <button
              onClick={saveAll}
              disabled={saving}
              className="text-sm px-3 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100">
        {shownStudents.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            tutors={data.tutors}
            saving={saving}
            dirty={rowDirty(s)}
            boardValue={boardOf(s)}
            tutorValue={tutorOf(s)}
            onSetBoard={(board) => setBoardEdit(s.id, board)}
            onAssign={(tutorId) => setTutorEdit(s.id, tutorId)}
          />
        ))}

        {shownStudents.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-10">
            {data.students.length === 0 ? 'No students yet.' : 'No students match this filter.'}
          </p>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition ${active
        ? 'bg-neutral-900 text-white border-neutral-900'
        : 'border-neutral-200/80 text-neutral-700 hover:border-neutral-400'
        }`}
    >
      <span className="font-medium">{label}</span>
      <span className={`font-mono ${active ? 'text-neutral-400' : 'text-neutral-400'}`}>
        {count}
      </span>
    </button>
  )
}

const SELECT =
  'text-sm rounded-xl border border-neutral-200/80 bg-white px-3 py-1.5 text-neutral-700 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-emerald-500'

function StudentRow({
  student,
  tutors,
  saving,
  dirty,
  boardValue,
  tutorValue,
  onAssign,
  onSetBoard,
}: {
  student: AdminStudent
  tutors: AdminTutor[]
  saving: boolean
  /** True when this row has unsaved dropdown edits. */
  dirty: boolean
  boardValue: string
  tutorValue: string
  onAssign: (tutorId: string | null) => void
  onSetBoard: (board: string | null) => void
}) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5 ${dirty ? 'bg-amber-50/60' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <Link
            href={`/admin/students/${student.id}`}
            className="text-sm font-medium text-neutral-900 truncate hover:underline"
          >
            {student.name ?? student.email ?? 'Unnamed student'}
          </Link>
          {dirty && (
            <span className="text-[10px] text-amber-700 shrink-0">unsaved</span>
          )}
        </span>
        <p className="text-xs text-neutral-400 truncate mt-0.5">
          {student.email}
          <Link
            href={`/admin/students/${student.id}`}
            className="text-emerald-600 hover:underline ml-2"
          >
            View report →
          </Link>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <select
          value={boardValue}
          onChange={(e) => onSetBoard(e.target.value || null)}
          disabled={saving}
          className={SELECT}
          title="Exam board"
        >
          <option value="">No board set</option>
          {EXAM_BOARDS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </select>

        <select
          value={tutorValue}
          onChange={(e) => onAssign(e.target.value || null)}
          disabled={saving}
          className={SELECT}
          title="Tutor"
        >
          <option value="">Unassigned</option>
          {tutors.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name ?? t.email}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}