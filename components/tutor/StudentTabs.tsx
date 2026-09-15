'use client'

import { useState } from 'react'

const TABS = ['Lessons', 'Homework', 'Sections', 'Papers', 'Topics'] as const
type Tab = (typeof TABS)[number]

export function StudentTabs({
  lessons,
  homework,
  sections,
  papers,
  topics,
}: {
  lessons: React.ReactNode
  homework: React.ReactNode
  sections: React.ReactNode
  papers: React.ReactNode
  topics: React.ReactNode
}) {
  const [tab, setTab] = useState<Tab>('Lessons')

  const panels: Record<Tab, React.ReactNode> = {
    Lessons: lessons,
    Homework: homework,
    Sections: sections,
    Papers: papers,
    Topics: topics,
  }

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-neutral-200/80 mb-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm transition border-b-2 -mb-px shrink-0 ${tab === t
              ? 'border-neutral-900 text-neutral-900 font-medium'
              : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {panels[tab]}
    </div>
  )
}