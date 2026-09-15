'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createLesson,
  updateLesson,
  type Lesson,
  type TopicOption,
  type PaperOption,
  type HomeworkFile,
} from '@/app/tutor/students/[student_id]/lesson-actions'
import { createClient } from '@/lib/client'
import { humanize } from '@/components/students/materials/types'
import { PaperPicker } from './PaperPicker'
import { DateInput } from '@/components/ui/DateInput'
import { tabIndents } from '@/lib/textarea'

const SELECT =
  'text-sm rounded-xl border border-neutral-200/80 bg-white px-3 py-1.5 text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500'

function isoDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

type DraftTopic = { topicId: string; minutes: string }

/** Serves both "log a lesson" and "edit this lesson" - pass `existing` to edit. */
export function LessonForm({
  studentId,
  topicOptions,
  paperOptions,
  suggestedPaperIds = [],
  existing = null,
  onDone,
  onCancel,
}: {
  studentId: string
  topicOptions: TopicOption[]
  paperOptions: PaperOption[]
  suggestedPaperIds?: string[]
  existing?: Lesson | null
  onDone: () => void
  onCancel: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(existing?.date ?? isoDays(0))
  const [duration, setDuration] = useState(
    existing?.durationMinutes != null ? String(existing.durationMinutes) : '60'
  )
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [topics, setTopics] = useState<DraftTopic[]>(
    existing && existing.topics.length > 0
      ? existing.topics.map((t) => ({
        topicId: t.topicId,
        minutes: t.minutes != null ? String(t.minutes) : '',
      }))
      : [{ topicId: '', minutes: '' }]
  )
  const [paperIds, setPaperIds] = useState<string[]>(
    existing?.papers.map((p) => p.ppId) ?? []
  )

  const hw = existing?.homework ?? null
  const [hwOpen, setHwOpen] = useState(!!hw)
  const [hwTitle, setHwTitle] = useState(hw?.title ?? '')
  const [hwNotes, setHwNotes] = useState(hw?.notes ?? '')
  const [hwDue, setHwDue] = useState(hw?.dueDate ?? isoDays(7))
  const [hwPaperIds, setHwPaperIds] = useState<string[]>(hw?.paperIds ?? [])
  const [hwFiles, setHwFiles] = useState<HomeworkFile[]>(hw?.files ?? [])
  const [uploading, setUploading] = useState(false)

  // Upload each chosen PDF straight to the public homework-pdfs bucket and keep
  // the returned paths in state; they're saved onto the homework row when the
  // lesson is saved. Path is prefixed by student so the bucket stays browsable.
  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError(null)
    setUploading(true)
    const supabase = createClient()
    const uploaded: HomeworkFile[] = []
    for (const file of Array.from(fileList)) {
      if (file.type !== 'application/pdf') {
        setError(`${file.name} isn't a PDF.`)
        continue
      }
      const safe = file.name.replace(/[^\w.\- ]+/g, '_')
      const path = `${studentId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safe}`
      const { error: upErr } = await supabase.storage
        .from('homework-pdfs')
        .upload(path, file, { contentType: 'application/pdf', upsert: false })
      if (upErr) {
        setError(`Couldn't upload ${file.name}: ${upErr.message}`)
        continue
      }
      uploaded.push({ path, name: file.name })
    }
    if (uploaded.length > 0) setHwFiles((prev) => [...prev, ...uploaded])
    setUploading(false)
  }

  const save = () => {
    const chosen = topics.filter((t) => t.topicId)
    if (chosen.length === 0) {
      setError('Pick at least one topic.')
      return
    }
    const seen = new Set<string>()
    for (const t of chosen) {
      if (seen.has(t.topicId)) {
        setError('That topic is listed twice.')
        return
      }
      seen.add(t.topicId)
    }
    if (hwOpen && !hwTitle.trim()) {
      setError('Give the homework a title, or remove it.')
      return
    }
    if (uploading) {
      setError('Wait for the PDF upload to finish.')
      return
    }

    setError(null)
    // A single topic covers the whole lesson, so if its minutes are left blank
    // default them to the lesson length (60 if that's blank too) — tutors often
    // forget to re-enter it. With two or more topics we leave blanks as null.
    const lessonLength = duration ? Number(duration) : 60
    const payload = {
      studentId,
      date,
      durationMinutes: duration ? Number(duration) : null,
      notes,
      topics: chosen.map((t) => ({
        topicId: t.topicId,
        minutes: t.minutes
          ? Number(t.minutes)
          : chosen.length === 1
            ? lessonLength
            : null,
      })),
      paperIds,
      homework: hwOpen
        ? {
            title: hwTitle,
            notes: hwNotes,
            dueDate: hwDue || null,
            paperIds: hwPaperIds,
            files: hwFiles,
          }
        : null,
    }

    startTransition(async () => {
      const res = existing
        ? await updateLesson({ ...payload, lessonId: existing.id })
        : await createLesson(payload)
      if (res.error) {
        setError(res.error)
        return
      }
      onDone()
      router.refresh()
    })
  }

  // topicOptions arrive sorted A Level → GCSE, then section, then topic. Collapse
  // into consecutive (qualification, section) groups for the dropdown's optgroups
  // (native <optgroup> can't nest, so the qualification is folded into the label).
  const topicGroups: { qual: string; section: string }[] = []
  for (const o of topicOptions) {
    const last = topicGroups[topicGroups.length - 1]
    if (!last || last.qual !== o.qual || last.section !== o.section) {
      topicGroups.push({ qual: o.qual, section: o.section })
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-300 p-4">
      {existing && (
        <p className="text-xs font-medium text-neutral-700 mb-3">Editing lesson</p>
      )}

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Date</label>
          <DateInput value={date} onChange={setDate} className={SELECT} />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Length (mins)</label>
          <input
            type="number"
            min="0"
            step="5"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`${SELECT} w-24 font-mono`}
          />
        </div>
      </div>

      <label className="block text-xs text-neutral-500 mb-1.5">Topics covered</label>
      <div className="space-y-2 mb-4">
        {topics.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={t.topicId}
              onChange={(e) =>
                setTopics((prev) =>
                  prev.map((p, j) => (j === i ? { ...p, topicId: e.target.value } : p))
                )
              }
              className={`${SELECT} flex-1 min-w-0`}
            >
              <option value="">Select a topic…</option>
              {topicGroups.map((g) => (
                <optgroup
                  key={`${g.qual}·${g.section}`}
                  label={`${humanize(g.qual)} · ${humanize(g.section)}`}
                >
                  {topicOptions
                    .filter((o) => o.qual === g.qual && o.section === g.section)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.topic}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="5"
              placeholder="mins"
              value={t.minutes}
              onChange={(e) =>
                setTopics((prev) =>
                  prev.map((p, j) => (j === i ? { ...p, minutes: e.target.value } : p))
                )
              }
              className={`${SELECT} w-20 font-mono shrink-0`}
            />
            {topics.length > 1 && (
              <button
                onClick={() => setTopics((prev) => prev.filter((_, j) => j !== i))}
                className="text-neutral-300 hover:text-red-500 transition text-sm px-1 shrink-0"
                title="Remove"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setTopics((prev) => [...prev, { topicId: '', minutes: '' }])}
          className="text-xs text-neutral-500 hover:text-neutral-900 transition"
        >
          + Add topic
        </button>
      </div>

      <label className="block text-xs text-neutral-500 mb-1.5">Materials used</label>
      <div className="mb-4">
        <PaperPicker
          options={paperOptions}
          selected={paperIds}
          onChange={setPaperIds}
          suggestedIds={suggestedPaperIds}
        />
      </div>

      <label className="block text-xs text-neutral-500 mb-1.5">Notes</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onKeyDown={tabIndents(notes, setNotes)}
        rows={2}
        placeholder="What was covered, how they got on, what to follow up…"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-y focus:outline-none focus:border-neutral-400 mb-3"
      />

      <div className="border-t border-neutral-100 pt-3 mb-3">
        {!hwOpen ? (
          <button
            onClick={() => setHwOpen(true)}
            className="text-xs text-neutral-500 hover:text-neutral-900 transition"
          >
            + Set homework
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-700">Homework</span>
              <button
                onClick={() => setHwOpen(false)}
                className="text-[11px] text-neutral-300 hover:text-red-500 transition"
              >
                Remove
              </button>
            </div>

            <div className="flex items-end gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <label className="block text-xs text-neutral-500 mb-1">Title</label>
                <input
                  value={hwTitle}
                  onChange={(e) => setHwTitle(e.target.value)}
                  placeholder="e.g. Pure 1 differentiation practice"
                  className={`${SELECT} w-full`}
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Due</label>
                <DateInput value={hwDue} onChange={setHwDue} className={SELECT} />
              </div>
            </div>

            <label className="block text-xs text-neutral-500 mb-1.5">
              Papers to complete
            </label>
            <div className="mb-2">
              <PaperPicker
                options={paperOptions}
                selected={hwPaperIds}
                onChange={setHwPaperIds}
                suggestedIds={suggestedPaperIds}
              />
            </div>

            <label className="block text-xs text-neutral-500 mb-1.5">
              Custom PDFs
            </label>
            <div className="mb-2 rounded-xl border border-neutral-200/80 p-3">
              {hwFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {hwFiles.map((f) => (
                    <span
                      key={f.path}
                      className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-neutral-900 text-white"
                    >
                      <span aria-hidden>📄</span>
                      <span className="max-w-[12rem] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setHwFiles((prev) => prev.filter((x) => x.path !== f.path))
                        }
                        className="text-neutral-400 hover:text-white transition"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <label className="text-xs text-neutral-500 hover:text-neutral-900 transition cursor-pointer inline-flex items-center gap-1.5">
                {uploading ? 'Uploading…' : '+ Add PDF'}
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  disabled={uploading}
                  onChange={(e) => {
                    uploadFiles(e.target.files)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              value={hwNotes}
              onChange={(e) => setHwNotes(e.target.value)}
              onKeyDown={tabIndents(hwNotes, setHwNotes)}
              rows={2}
              placeholder="Instructions for the student…"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm resize-y focus:outline-none focus:border-neutral-400"
            />
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending || uploading}
          className="text-sm px-3 py-1.5 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition disabled:opacity-50"
        >
          {pending ? 'Saving…' : existing ? 'Save changes' : 'Save lesson'}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}