'use client'

import type { Lesson } from '@/app/tutor/students/[student_id]/lesson-actions'
import { PaperLink } from '@/components/students/materials/PaperLink'
import { NoteText } from '@/components/ui/NoteText'

function hrs(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Derived from the server-supplied daysAgo, so no clock reads on the client. */
function agoLabel(days: number) {
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days}d ago`
  if (days < 60) return `${Math.round(days / 7)}w ago`
  return `${Math.round(days / 30)}mo ago`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  })
}

/** Every month from the earliest lesson to the latest, gaps included. */
function monthRange(keys: string[]) {
  if (keys.length === 0) return []
  const sorted = [...keys].sort()
  const [sy, sm] = sorted[0].split('-').map(Number)
  const [ey, em] = sorted[sorted.length - 1].split('-').map(Number)

  const out: string[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out.slice(-12)
}

export function LessonTimeline({
  lessons,
  onEdit,
  onDelete,
  editingId,
  busy,
}: {
  lessons: Lesson[]
  /** Omit on the student view - read-only. */
  onEdit?: (lesson: Lesson) => void
  onDelete?: (id: string) => void
  editingId?: string | null
  busy?: boolean
}) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 p-8 text-center">
        <p className="text-sm text-neutral-400">No lessons logged yet.</p>
      </div>
    )
  }

  let totalMins = 0
  let totalTracked = 0

  const byTopic = new Map<string, { mins: number; lastSeen: number }>()
  const byMonth = new Map<string, number>()

  for (const l of lessons) {
    totalMins += l.durationMinutes ?? 0
    byMonth.set(l.monthKey, (byMonth.get(l.monthKey) ?? 0) + (l.durationMinutes ?? 0))

    for (const t of l.topics) {
      const entry = byTopic.get(t.topic) ?? { mins: 0, lastSeen: Infinity }
      if (t.minutes) {
        entry.mins += t.minutes
        totalTracked += t.minutes
      }
      entry.lastSeen = Math.min(entry.lastSeen, l.daysAgo)
      byTopic.set(t.topic, entry)
    }
  }

  const topicRows = [...byTopic.entries()]
    .map(([topic, v]) => ({ topic, total: v.mins, lastSeen: v.lastSeen }))
    .sort((a, b) => a.lastSeen - b.lastSeen || b.total - a.total)

  const maxTopic = Math.max(1, ...topicRows.map((t) => t.total))

  const months = monthRange([...byMonth.keys()])
  const maxMonth = Math.max(1, ...months.map((m) => byMonth.get(m) ?? 0))

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Lessons</p>
          <p className="text-xl font-semibold font-mono">{lessons.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Total time</p>
          <p className="text-xl font-semibold font-mono">{hrs(totalMins)}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 px-4 py-2.5 flex-1">
          <p className="text-xs text-neutral-500">Last lesson</p>
          <p className="text-xl font-semibold font-mono">
            {agoLabel(lessons[0].daysAgo)}
          </p>
        </div>
      </div>

      {months.length > 1 && (
        <div>
          <p className="text-xs text-neutral-500 mb-2">Lesson time by month</p>
          <div className="rounded-2xl border border-neutral-200/80 px-4 pt-4 pb-2">
            <div className="flex items-end gap-1.5 h-16">
              {months.map((m) => {
                const mins = byMonth.get(m) ?? 0
                return (
                  <div
                    key={m}
                    className="flex-1 flex flex-col justify-end h-full"
                    title={`${monthLabel(m)} - ${hrs(mins)}`}
                  >
                    <div
                      className={`rounded-sm ${mins > 0 ? 'bg-neutral-900' : 'bg-neutral-100'}`}
                      style={{
                        height: mins > 0 ? `${(mins / maxMonth) * 100}%` : '2px',
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {months.map((m) => (
                <span
                  key={m}
                  className="flex-1 text-[10px] text-neutral-400 text-center"
                >
                  {monthLabel(m)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {topicRows.length > 0 && (
        <div>
          <p className="text-xs text-neutral-500 mb-2">
            Time by topic
            <span className="text-neutral-300 ml-2 font-mono">
              {hrs(totalTracked)} tracked
            </span>
          </p>

          <div className="rounded-2xl border border-neutral-200/80 px-4 py-3 space-y-1.5">
            {topicRows.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="text-xs text-neutral-600 w-32 shrink-0 truncate">
                  {t.topic}
                </span>

                <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${(t.total / maxTopic) * 100}%` }}
                  />
                </div>

                <span className="text-[11px] font-mono text-neutral-400 w-12 text-right shrink-0">
                  {t.total > 0 ? hrs(t.total) : '-'}
                </span>
                <span className="text-[11px] font-mono text-neutral-400 w-14 text-right shrink-0">
                  {agoLabel(t.lastSeen)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-neutral-500 mb-2">Timeline</p>
        <div className="rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100">
          {lessons.map((l) => {
            const tracked = l.topics.reduce((a, t) => a + (t.minutes ?? 0), 0)

            return (
              <div
                key={l.id}
                className={`px-4 py-2.5 ${busy ? 'opacity-60' : ''} ${l.id === editingId ? 'bg-neutral-50' : ''
                  }`}
              >
                <div className="flex items-center gap-2.5 flex-wrap gap-y-1.5">
                  <span className="text-xs font-medium text-neutral-900 shrink-0">
                    {l.dateLabel}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-300 shrink-0">
                    {agoLabel(l.daysAgo)}
                  </span>
                  {l.durationMinutes && (
                    <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                      · {hrs(l.durationMinutes)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0" />
                  {onEdit && (
                    <button
                      onClick={() => onEdit(l)}
                      className="text-[11px] text-neutral-400 hover:text-neutral-900 transition shrink-0"
                    >
                      {l.homework ? 'Edit' : 'Edit / set homework'}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(l.id)}
                      className="text-[11px] text-neutral-300 hover:text-red-500 transition shrink-0"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {tracked > 0 && (
                  <div className="flex h-1 rounded-full overflow-hidden bg-neutral-100 mt-1.5 max-w-sm">
                    {l.topics
                      .filter((t) => t.minutes)
                      .map((t, i) => (
                        <div
                          key={t.topicId}
                          className={i % 2 === 0 ? 'bg-neutral-900' : 'bg-neutral-400'}
                          style={{ width: `${(t.minutes! / tracked) * 100}%` }}
                          title={`${t.topic} - ${hrs(t.minutes!)}`}
                        />
                      ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mt-1.5">
                  {l.topics.map((t) => (
                    <span
                      key={t.topicId}
                      className="text-[11px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
                    >
                      {t.topic}
                      {t.minutes ? (
                        <span className="font-mono text-neutral-400 ml-1">
                          {t.minutes}m
                        </span>
                      ) : null}
                    </span>
                  ))}
                  {l.papers.map((p) => (
                    <span
                      key={p.ppId}
                      className="text-[11px] px-1.5 py-0.5 rounded-full border border-neutral-200 text-neutral-500"
                    >
                      <PaperLink label={p.label} qpPath={p.qpPath} msPath={p.msPath} />
                    </span>
                  ))}
                  {l.homework && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      HW: {l.homework.title}
                    </span>
                  )}
                </div>

                {l.notes && (
                  <div className="text-[11px] text-neutral-500 mt-1.5 border-l-2 border-neutral-200 pl-2">
                    <NoteText text={l.notes} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}