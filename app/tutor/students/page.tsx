import Link from 'next/link'
import { getTutorStudents } from './actions'
import { examBoardLabel } from '@/lib/exam-board'

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

export default async function TutorStudentsPage() {
  const students = await getTutorStudents()

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">Tutor</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your students</h1>
        </div>
        <span className="text-xs font-mono text-neutral-400 shrink-0">
          {students.length} student{students.length !== 1 ? 's' : ''}
        </span>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200/80 p-10 text-center">
          <p className="text-sm text-neutral-400">
            No students assigned to you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {students.map((s) => {
            const overall = pct(s.totalAttempted, s.totalQuestions)
            return (
              <Link
                key={s.id}
                href={`/tutor/students/${s.id}`}
                className="rounded-2xl border border-neutral-200/80 hover:border-neutral-300 transition px-4 py-3.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {s.name ?? s.email ?? 'Unnamed student'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-neutral-400 truncate">{s.email}</p>
                      {s.exam_board && (
                        <span className="text-[11px] text-neutral-400">
                          · {examBoardLabel(s.exam_board)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-lg font-semibold font-mono text-neutral-900 shrink-0">
                    {overall}%
                  </span>
                </div>

                <div className="mt-3 h-1 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${overall}%` }}
                  />
                </div>
                <p className="text-xs font-mono text-neutral-400 mt-1.5">
                  {s.totalAttempted}/{s.totalQuestions} questions
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}