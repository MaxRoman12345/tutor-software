import { createClient } from '@/lib/server'
import { getLessons } from '@/app/tutor/students/[student_id]/lesson-actions'
import { LessonTimeline } from '@/components/tutor/LessonTimeline'

export default async function StudentLessonsPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const studentId = claims?.claims?.sub

  const lessons = studentId ? await getLessons(studentId) : []

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
        Lessons
      </h1>
      <p className="text-xs text-neutral-400 mb-6">
        A record of what you&apos;ve covered with your tutor.
      </p>

      <LessonTimeline lessons={lessons} />
    </div>
  )
}