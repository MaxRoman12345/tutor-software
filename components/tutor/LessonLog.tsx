'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  deleteLesson,
  type Lesson,
  type TopicOption,
  type PaperOption,
} from '@/app/tutor/students/[student_id]/lesson-actions'
import { LessonTimeline } from './LessonTimeline'
import { LessonForm } from './LessonForm'

type Mode = { kind: 'none' } | { kind: 'new' } | { kind: 'edit'; lesson: Lesson }

export function LessonLog({
  studentId,
  lessons,
  topicOptions,
  paperOptions,
  suggestedPaperIds = [],
}: {
  studentId: string
  lessons: Lesson[]
  topicOptions: TopicOption[]
  paperOptions: PaperOption[]
  suggestedPaperIds?: string[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode] = useState<Mode>({ kind: 'none' })

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deleteLesson(id, studentId)
      if (res.error) console.error(res.error)
      else router.refresh()
    })
  }

  return (
    <div>
      <div className="mb-4">
        {mode.kind === 'none' ? (
          <button
            onClick={() => setMode({ kind: 'new' })}
            className="text-sm px-3 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition"
          >
            Log a lesson
          </button>
        ) : (
          <LessonForm
            // remount when switching between lessons so the form re-seeds
            key={mode.kind === 'edit' ? mode.lesson.id : 'new'}
            studentId={studentId}
            topicOptions={topicOptions}
            paperOptions={paperOptions}
            suggestedPaperIds={suggestedPaperIds}
            existing={mode.kind === 'edit' ? mode.lesson : null}
            onDone={() => setMode({ kind: 'none' })}
            onCancel={() => setMode({ kind: 'none' })}
          />
        )}
      </div>

      <LessonTimeline
        lessons={lessons}
        onEdit={(l) => setMode({ kind: 'edit', lesson: l })}
        onDelete={remove}
        editingId={mode.kind === 'edit' ? mode.lesson.id : null}
        busy={pending}
      />
    </div>
  )
}