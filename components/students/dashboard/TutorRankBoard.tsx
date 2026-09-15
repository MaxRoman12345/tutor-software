'use client'

import type { TopicRank } from '@/app/student/dashboard/actions'
import { sectionLabel, sectionOrder } from '@/lib/sections'

/**
 * Student-facing view of the tutor's per-topic strength ranks (1-5). Shows
 * only the bars — the tutor's notes are never sent to the student.
 */
export function TutorRankBoard({ ranks }: { ranks: TopicRank[] }) {
  if (ranks.length === 0) return null

  const grouped = new Map<string, TopicRank[]>()
  for (const r of ranks) {
    const s = sectionLabel(r.section)
    if (!grouped.has(s)) grouped.set(s, [])
    grouped.get(s)!.push(r)
  }
  const ordered = [...grouped.entries()].sort(
    (a, b) => sectionOrder(a[0]) - sectionOrder(b[0])
  )

  return (
    <div className="mt-10">
      <h2 className="text-sm font-medium mb-1">Tutor assessment</h2>
      <p className="text-xs text-neutral-400 mb-4">
        Your tutor&apos;s rating of your strength on each topic, out of 5.
      </p>

      <div className="space-y-5">
        {ordered.map(([section, list]) => (
          <div key={section}>
            <p className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
              {section}
            </p>
            <div className="rounded-xl border border-neutral-200/80 divide-y divide-neutral-100">
              {list
                .slice()
                .sort((a, b) => a.topic.localeCompare(b.topic))
                .map((r) => (
                  <div key={r.topicId} className="px-3 py-2 flex items-center gap-3">
                    <span className="text-xs text-neutral-700 flex-1 min-w-0 truncate">
                      {r.topic}
                    </span>
                    <div className="w-24 sm:w-32 h-1.5 rounded-full bg-neutral-100 overflow-hidden shrink-0">
                      <div
                        className="h-full bg-neutral-900 rounded-full"
                        style={{ width: `${(r.rank / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400 w-6 text-right shrink-0">
                      {r.rank}/5
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
