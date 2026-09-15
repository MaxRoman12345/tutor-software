import Link from 'next/link'

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-neutral-50 p-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="font-semibold tracking-tight text-neutral-900">
          Systemised Maths
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-neutral-400">{description}</p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
