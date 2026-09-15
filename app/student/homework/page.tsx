import { createClient } from '@/lib/server'
import { getHomework } from '@/app/tutor/students/[student_id]/homework-actions'
import { HomeworkList } from '@/components/homework/HomeworkList'

export default async function StudentHomeworkPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const studentId = claims?.claims?.sub

  const homework = studentId ? await getHomework(studentId) : []

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-1">
        Homework
      </h1>
      <p className="text-xs text-neutral-400 mb-6">
        Mark the questions in Materials as you go - your homework updates itself.
      </p>

      <HomeworkList homework={homework} studentId={studentId ?? ''} />
    </div>
  )
}