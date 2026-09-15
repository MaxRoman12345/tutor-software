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
  const [savingId, setSavingId] = useState<string | null>(null)
  // Tutor filter: 'all', 'unassigned', or a tutor id.
  const [filter, setFilter] = useState<string>('all')

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

  async function handleAssign(studentId: string, tutorId: string) {
    if (!tutorId) {
      handleUnassign(studentId)
      return
    }
    setSavingId(studentId)
    const tutor = data!.tutors.find((t) => t.id === tutorId) ?? null
    setData((prev) =>
      prev
        ? {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, tutor } : s
          ),
        }
        : prev
    )
    const { error } = await assignStudentToTutor(studentId, tutorId)
    if (error) console.error(error)
    setSavingId(null)
  }

  async function handleUnassign(studentId: string) {
    setSavingId(studentId)
    setData((prev) =>
      prev
        ? {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, tutor: null } : s
          ),
        }
        : prev
    )
    const { error } = await unassignStudent(studentId)
    if (error) console.error(error)
    setSavingId(null)
  }

  async function handleSetBoard(studentId: string, board: string | null) {
    setSavingId(studentId)
    setData((prev) =>
      prev
        ? {
          ...prev,
          students: prev.students.map((s) =>
            s.id === studentId ? { ...s, exam_board: board } : s
          ),
        }
        : prev
    )
    const { error } = await setStudentExamBoard(studentId, board)
    if (error) console.error(error)
    setSavingId(null)
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

      <div className="rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100">
        {shownStudents.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            tutors={data.tutors}
            saving={savingId === s.id}
            onAssign={(tutorId) => handleAssign(s.id, tutorId)}
            onSetBoard={(board) => handleSetBoard(s.id, board)}
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
  onAssign,
  onSetBoard,
}: {
  student: AdminStudent
  tutors: AdminTutor[]
  saving: boolean
  onAssign: (tutorId: string) => void
  onSetBoard: (board: string | null) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <Link
          href={`/admin/students/${student.id}`}
          className="text-sm font-medium text-neutral-900 truncate hover:underline"
        >
          {student.name ?? student.email ?? 'Unnamed student'}
        </Link>
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
          value={student.exam_board ?? ''}
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
          value={student.tutor?.id ?? ''}
          onChange={(e) => onAssign(e.target.value)}
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