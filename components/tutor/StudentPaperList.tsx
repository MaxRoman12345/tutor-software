'use client'

import { useState } from 'react'
import type { StudentPaper } from '@/app/tutor/students/[student_id]/actions'
import { humanize, moduleLabel, specLabel, pdfUrl } from '@/components/students/materials/types'
import { NoteText } from '@/components/ui/NoteText'
import { SegmentBar } from '@/components/students/materials/SegmentBar'
import { ChevronIcon, DocIcon, DownloadIcon } from '@/components/students/materials/icons'

const OUTCOME_PILL: Record<string, string> = {
  correct: 'bg-emerald-500 text-white',
  partial: 'bg-amber-500 text-white',
  incorrect: 'bg-red-500 text-white',
}
const OUTCOME_LABEL: Record<string, string> = {
  correct: 'Correct',
  partial: 'Partial',
  incorrect: 'Incorrect',
}

async function downloadPdf(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch {
    window.open(url, '_blank')
  }
}

function Difficulty({ level }: { level: number | null }) {
  if (level == null)
    return <span className="text-xs text-neutral-300 w-16 text-right shrink-0">-</span>
  const colours = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500']
  return (
    <span
      className="flex items-center gap-1 w-16 justify-end shrink-0"
      title={`Difficulty ${level}/3`}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-3 rounded-full ${i <= level ? colours[level - 1] : 'bg-neutral-200'}`}
        />
      ))}
    </span>
  )
}

export function StudentPaperList({ papers }: { papers: StudentPaper[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (papers.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200/80 p-10 text-center">
        <p className="text-sm text-neutral-400">
          This student hasn&apos;t started any papers yet.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-neutral-200/80 divide-y divide-neutral-100">
      {papers.map((p) => {
        const open = openId === p.id
        const marked = p.correct + p.partial + p.incorrect
        const progress = {
          total: p.total,
          correct: p.correct,
          partial: p.partial,
          incorrect: p.incorrect,
        }
        const moduleText = moduleLabel(p.module, p.gcseAlevel)
        const label = `${humanize(p.examBoard)} ${moduleText} ${p.paperYear ?? ''}`.trim()
        const qpUrl = pdfUrl(p.qpPath)
        const msUrl = pdfUrl(p.msPath)
        const done = p.questions.filter((q) => q.outcome)

        return (
          <div key={p.id}>
            <button
              onClick={() => setOpenId(open ? null : p.id)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-neutral-900 truncate min-w-0">
                    {`${humanize(p.examBoard)} ${moduleText} · ${p.paperYear}`}
                  </span>
                  <span className="text-[11px] text-neutral-400 shrink-0">
                    {specLabel(p.specLevel)}
                  </span>
                </div>
                <div className="mt-1.5 max-w-xs">
                  <SegmentBar progress={progress} thin />
                </div>
              </div>

              {p.lastActivityLabel && (
                <span className="text-xs text-neutral-400 shrink-0 hidden sm:block">
                  {p.lastActivityLabel}
                </span>
              )}

              <span className="text-xs font-mono text-neutral-400 shrink-0 w-12 text-right">
                {marked}/{p.total}
              </span>

              <ChevronIcon open={open} />
            </button>

            {open && (
              <div className="border-t border-neutral-100 bg-neutral-50/50">
                {(qpUrl || msUrl) && (
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-100">
                    {qpUrl && (
                      <>
                        <button
                          onClick={() => window.open(qpUrl, '_blank')}
                          className="text-[11px] text-neutral-500 hover:text-neutral-900 transition flex items-center gap-1"
                        >
                          <DocIcon size={3} />
                          QP
                        </button>
                        <button
                          onClick={() => downloadPdf(qpUrl, `${label} QP.pdf`)}
                          className="text-[11px] text-neutral-400 hover:text-neutral-900 transition flex items-center"
                        >
                          <DownloadIcon size={3} />
                        </button>
                      </>
                    )}
                    {qpUrl && msUrl && (
                      <span className="text-neutral-200 text-xs select-none">|</span>
                    )}
                    {msUrl && (
                      <>
                        <button
                          onClick={() => window.open(msUrl, '_blank')}
                          className="text-[11px] text-neutral-500 hover:text-neutral-900 transition flex items-center gap-1"
                        >
                          <DocIcon size={3} />
                          MS
                        </button>
                        <button
                          onClick={() => downloadPdf(msUrl, `${label} MS.pdf`)}
                          className="text-[11px] text-neutral-400 hover:text-neutral-900 transition flex items-center"
                        >
                          <DownloadIcon size={3} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {done.length === 0 ? (
                  <p className="text-xs text-neutral-400 px-4 py-4 text-center">
                    Nothing marked in this paper.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {done.map((q) => (
                      <div key={q.id} className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-neutral-900 w-10 shrink-0">
                            {q.questionNumber ?? '-'}
                          </span>
                          <span className="text-sm text-neutral-600 truncate flex-1 min-w-0">
                            {q.topic ?? 'Untagged'}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${OUTCOME_PILL[q.outcome!]}`}
                          >
                            {OUTCOME_LABEL[q.outcome!]}
                          </span>
                          <Difficulty level={q.difficulty} />
                        </div>
                        {q.note && (
                          <div className="text-xs text-neutral-500 mt-1.5 ml-13 border-l-2 border-neutral-200 pl-2">
                            <NoteText text={q.note} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {p.total - done.length > 0 && (
                  <p className="text-xs text-neutral-400 px-4 py-2 border-t border-neutral-100">
                    {p.total - done.length} question
                    {p.total - done.length !== 1 ? 's' : ''} not yet marked
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}