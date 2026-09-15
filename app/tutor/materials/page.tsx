'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getPapers,
  getQuestionsForPaper,
  type Paper,
  type QuestionRow,
} from '@/app/student/materials/actions'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  humanize,
  specLabel,
  moduleLabel,
  uniq,
  pdfUrl,
} from '@/components/students/materials/types'
import { FilterRow } from '@/components/students/materials/FilterRow'
import { PaperCard } from '@/components/students/materials/PaperCard'
import { QuestionTableHeader } from '@/components/students/materials/QuestionTableHeader'

function FileIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0">
      <path
        d="M3 2a1 1 0 011-1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0">
      <path
        d="M8 2v8M5 7l3 3 3-3M3 13h10"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

export default function TutorMaterialsPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [qual, setQual] = useState<string | null>(null)
  const [board, setBoard] = useState<string | null>(null)
  const [spec, setSpec] = useState<string | null>(null)
  const [module, setModule] = useState<string | null>(null)
  const [openPaper, setOpenPaper] = useState<Paper | null>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [qLoading, setQLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    getPapers()
      .then((p) => setPapers(p))
      .catch((e) => setError(e?.message ?? 'Failed to load materials.'))
      .finally(() => setLoading(false))
  }, [])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    load()
  }, [load])

  useEffect(() => {
    load()
  }, [load])

  const isGcse = qual === 'GCSE'

  const quals = useMemo(() => uniq(papers.map((p) => p.gcse_alevel)), [papers])
  const boards = useMemo(
    () => uniq(papers.filter((p) => p.gcse_alevel === qual).map((p) => p.exam_board)),
    [papers, qual]
  )
  const specs = useMemo(
    () =>
      uniq(
        papers
          .filter((p) => p.gcse_alevel === qual && p.exam_board === board)
          .map((p) => p.spec_level)
      ),
    [papers, qual, board]
  )
  const modules = useMemo(
    () =>
      uniq(
        papers
          .filter(
            (p) =>
              p.gcse_alevel === qual &&
              p.exam_board === board &&
              p.spec_level === spec
          )
          .map((p) => p.module)
      ),
    [papers, qual, board, spec]
  )
  const years = useMemo(
    () =>
      papers.filter(
        (p) =>
          p.gcse_alevel === qual &&
          p.exam_board === board &&
          p.spec_level === spec &&
          p.module === module
      ),
    [papers, qual, board, spec, module]
  )

  const openYear = async (paper: Paper) => {
    setOpenPaper(paper)
    setQLoading(true)
    // no studentId - this is a browse view, outcomes/notes come back null
    setQuestions(await getQuestionsForPaper(paper.id))
    setQLoading(false)
  }

  if (loading) {
    return (
      <p className="text-sm text-neutral-400 py-12 text-center">
        Loading materials…
      </p>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <ErrorState message={error} onRetry={retry} />
      </div>
    )
  }

  if (openPaper) {
    const moduleText = moduleLabel(openPaper.module, openPaper.gcse_alevel)
    const boardText = humanize(openPaper.exam_board)
    const qpUrl = pdfUrl(openPaper.qp_path)
    const msUrl = pdfUrl(openPaper.ms_path)
    const paperLabel = `${boardText} ${moduleText} ${openPaper.paper_year ?? ''}`.trim()
    const heading = `${boardText} ${moduleText} · ${openPaper.paper_year}`

    return (
      <div>
        <button
          onClick={() => setOpenPaper(null)}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition mb-5"
        >
          ← Back
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            {heading}
          </h1>

          {(qpUrl || msUrl) && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {qpUrl && (
                <>
                  <button
                    onClick={() => window.open(qpUrl, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                  >
                    <FileIcon />
                    View QP
                  </button>
                  <button
                    onClick={() => downloadPdf(qpUrl, `${paperLabel} QP.pdf`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                  >
                    <ArrowDownIcon />
                    QP
                  </button>
                </>
              )}
              {msUrl && (
                <>
                  <button
                    onClick={() => window.open(msUrl, '_blank')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                  >
                    <FileIcon />
                    View MS
                  </button>
                  <button
                    onClick={() => downloadPdf(msUrl, `${paperLabel} MS.pdf`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-xs text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 transition"
                  >
                    <ArrowDownIcon />
                    MS
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {qLoading ? (
          <p className="text-sm text-neutral-400 py-12 text-center">
            Loading questions…
          </p>
        ) : questions.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200/80 p-10 text-center">
            <p className="text-sm text-neutral-400">
              No questions logged for this paper yet.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-neutral-400 px-1 mb-3">
              {questions.length} questions · to see a student&apos;s marks, open them
              from Students.
            </p>
            <div className="rounded-2xl border border-neutral-200/80 overflow-hidden">
              <QuestionTableHeader />
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center gap-4 px-4 sm:px-5 py-3 sm:py-3.5 border-t border-neutral-100"
                >
                  <span className="font-mono text-sm text-neutral-900 w-8 sm:w-12 shrink-0">
                    {q.question_number ?? '-'}
                  </span>
                  <span className="text-sm text-neutral-700 truncate flex-1 min-w-0">
                    {q.topics?.topic ?? 'Untagged'}
                  </span>
                  <Difficulty level={q.difficulty} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold tracking-tight mb-6">
        Materials
      </h1>

      <div className="space-y-5">
        <FilterRow
          label="Qualification"
          options={quals}
          selected={qual}
          onSelect={(v) => {
            setQual(v)
            setBoard(null)
            setSpec(null)
            setModule(null)
          }}
          format={humanize}
        />
        {qual && (
          <FilterRow
            label="Exam board"
            options={boards}
            selected={board}
            onSelect={(v) => {
              setBoard(v)
              setSpec(null)
              setModule(null)
            }}
            format={humanize}
          />
        )}
        {board && (
          <FilterRow
            label={isGcse ? 'Tier' : 'Specification'}
            options={specs}
            selected={spec}
            onSelect={(v) => {
              setSpec(v)
              setModule(null)
            }}
            format={specLabel}
          />
        )}
        {spec && (
          <FilterRow
            label={isGcse ? 'Paper' : 'Module'}
            options={modules}
            selected={module}
            onSelect={setModule}
            format={(v) => moduleLabel(v, qual)}
          />
        )}
      </div>

      {module && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium">Papers</h2>
            <span className="text-xs font-mono text-neutral-400">
              {years.length} available
            </span>
          </div>
          {years.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">
              No papers found for this combination.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {years.map((p) => (
                <PaperCard key={p.id} paper={p} onOpen={() => openYear(p)} />
              ))}
            </div>
          )}
        </div>
      )}

      {!qual && (
        <p className="text-sm text-neutral-400 mt-10 text-center">
          Pick a qualification to get started.
        </p>
      )}
    </div>
  )
}
