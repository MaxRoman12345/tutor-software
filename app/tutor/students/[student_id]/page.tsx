import Link from 'next/link'
import { getDashboardData } from '@/app/student/dashboard/actions'
import { getStudentPapers } from './actions'
import { getLessons, getLessonOptions } from './lesson-actions'
import { getHomework } from './homework-actions'
import { getTopicAssessments } from './assessment-actions'
import { StudentTabs } from '@/components/tutor/StudentTabs'
import { StudentPaperList } from '@/components/tutor/StudentPaperList'
import { SectionList } from '@/components/tutor/SectionList'
import { TopicList } from '@/components/tutor/TopicList'
import { LessonLog } from '@/components/tutor/LessonLog'
import { HomeworkList } from '@/components/homework/HomeworkList'
import { examBoardLabel } from '@/lib/exam-board'

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

export default async function TutorStudentDetailPage({
  params,
}: {
  params: Promise<{ student_id: string }>
}) {
  const { student_id: studentId } = await params

  const [dashboard, { papers, sections }, lessons, homework, options, assessments] =
    await Promise.all([
      getDashboardData(studentId),
      getStudentPapers(studentId),
      getLessons(studentId),
      getHomework(studentId),
      getLessonOptions(),
      getTopicAssessments(studentId),
    ])

  const overallPct = pct(dashboard.totalAttempted, dashboard.totalQuestions)
  const name = dashboard.name ?? dashboard.email?.split('@')[0] ?? 'Student'

  // papers arrive newest-activity-first - offer the top few as quick picks
  const suggestedPaperIds = papers.slice(0, 5).map((p) => p.id)

  return (
    <div>
      <Link
        href="/tutor/students"
        className="text-xs text-neutral-400 hover:text-neutral-700 transition mb-3 inline-block"
      >
        ← All students
      </Link>

      <div className="flex items-center justify-between gap-4 mb-6">
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
          <span className="text-2xl font-semibold font-mono">{overallPct}%</span>
          <span className="text-xs font-mono text-neutral-400">
            {dashboard.totalAttempted}/{dashboard.totalQuestions}
          </span>
        </div>
      </div>

      {!dashboard.exam_board && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-5">
          No exam board set - showing all {dashboard.totalQuestions} questions rather
          than their programme. Set it in the admin view.
        </div>
      )}

      <StudentTabs
        lessons={
          <LessonLog
            studentId={studentId}
            lessons={lessons}
            topicOptions={options.topics}
            paperOptions={options.papers}
            suggestedPaperIds={suggestedPaperIds}
          />
        }
        homework={
          <HomeworkList homework={homework} studentId={studentId} canDelete />
        }
        sections={<SectionList sections={sections} />}
        papers={<StudentPaperList papers={papers} />}
        topics={
          <TopicList
            topics={dashboard.topics}
            assessments={assessments}
            lessons={lessons}
            studentId={studentId}
          />
        }
      />
    </div>
  )
}