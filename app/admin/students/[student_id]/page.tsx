import Link from 'next/link'
import { getDashboardData } from '@/app/student/dashboard/actions'
import { getStudentPapers } from '@/app/tutor/students/[student_id]/actions'
import { getLessons } from '@/app/tutor/students/[student_id]/lesson-actions'
import { getHomework } from '@/app/tutor/students/[student_id]/homework-actions'
import { LessonTimeline } from '@/components/tutor/LessonTimeline'
import { HomeworkList } from '@/components/homework/HomeworkList'
import { SectionList } from '@/components/tutor/SectionList'
import { examBoardLabel } from '@/lib/exam-board'

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function hrs(mins: number) {
  if (mins <= 0) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xl font-semibold font-mono">{value}</p>
    </div>
  )
}

export default async function AdminStudentReportPage({
  params,
}: {
  params: Promise<{ student_id: string }>
}) {
  const { student_id: studentId } = await params

  const [dashboard, { sections }, lessons, homework] = await Promise.all([
    getDashboardData(studentId),
    getStudentPapers(studentId),
    getLessons(studentId),
    getHomework(studentId),
  ])

  const name = dashboard.name ?? dashboard.email?.split('@')[0] ?? 'Student'
  const coverage = pct(dashboard.totalAttempted, dashboard.totalQuestions)
  const lessonMinutes = lessons.reduce((a, l) => a + (l.durationMinutes ?? 0), 0)
  const hwDone = homework.filter((h) => h.completed).length

  return (
    <div>
      <Link
        href="/admin"
        className="text-xs text-neutral-400 hover:text-neutral-700 transition mb-3 inline-block"
      >
        ← All students
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight truncate">{name}</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {dashboard.email}
            {dashboard.exam_board && (
              <span> · {examBoardLabel(dashboard.exam_board)}</span>
            )}
          </p>
        </div>
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="text-2xl font-semibold font-mono">{coverage}%</span>
          <span className="text-xs font-mono text-neutral-400">
            {dashboard.totalAttempted}/{dashboard.totalQuestions}
          </span>
        </div>
      </div>

      {/* Short progress summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Coverage" value={`${coverage}%`} />
        <Stat label="Lessons" value={String(lessons.length)} />
        <Stat label="Lesson time" value={hrs(lessonMinutes)} />
        <Stat label="Homework done" value={`${hwDone}/${homework.length}`} />
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-sm font-medium mb-3">Lessons</h2>
          <LessonTimeline lessons={lessons} />
        </section>

        <section>
          <h2 className="text-sm font-medium mb-3">Homework</h2>
          <HomeworkList homework={homework} studentId={studentId} readOnly />
        </section>

        <section>
          <h2 className="text-sm font-medium mb-3">Coverage by section</h2>
          <SectionList sections={sections} />
        </section>
      </div>
    </div>
  )
}
