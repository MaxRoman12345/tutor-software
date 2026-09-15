export function QuestionTableHeader() {
  return (
    <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 bg-neutral-50 border-b border-neutral-200/80 text-xs text-neutral-500">
      <span className="w-12 shrink-0">Question</span>
      <span className="flex-1">Topic</span>
      <span className="w-16 shrink-0 text-right">Difficulty</span>
    </div>
  )
}