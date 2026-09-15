'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  getDashboardData,
  getMyTopicRanks,
  type DashboardData,
  type TopicRank,
} from './actions'
import { OverallRing, TopicCoverageGrid } from '@/components/students/dashboard/TopicCoverage'
import { TutorRankBoard } from '@/components/students/dashboard/TutorRankBoard'
import { examBoardLabel } from '@/lib/exam-board'
import { ErrorState } from '@/components/ui/ErrorState'

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [ranks, setRanks] = useState<TopicRank[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    Promise.all([getDashboardData(), getMyTopicRanks()])
      .then(([d, r]) => {
        setData(d)
        setRanks(r)
      })
      .catch((e) => setError(e?.message ?? 'Failed to load your dashboard.'))
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

  if (loading) {
    return (
      <p className="text-sm text-neutral-400 py-12 text-center">
        Loading dashboard…
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

  if (!data) return null

  const overallPct = pct(data.totalAttempted, data.totalQuestions)
  const name = data.name ?? data.email?.split('@')[0] ?? 'there'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs text-neutral-400 mb-0.5">
            {data.exam_board ? `${examBoardLabel(data.exam_board)} programme` : 'Programme'}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Hi, {name}</h1>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-neutral-200/80 px-5 py-3 shrink-0">
          <OverallRing pct={overallPct} />
          <div>
            <p className="text-xs text-neutral-500">Overall coverage</p>
            <p className="text-2xl font-semibold font-mono">{overallPct}%</p>
            <p className="text-xs font-mono text-neutral-400">
              {data.totalAttempted}/{data.totalQuestions} questions
            </p>
          </div>
        </div>
      </div>

      {!data.exam_board && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-6">
          No exam board set - your tutor will update this. Showing all available
          questions for now.
        </div>
      )}

      <TopicCoverageGrid topics={data.topics} />

      <TutorRankBoard ranks={ranks} />
    </div>
  )
}