export function DocIcon({ size = 3.5 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`h-${size} w-${size} shrink-0`}>
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

export function DownloadIcon({ size = 3.5 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`h-${size} w-${size} shrink-0`}>
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

export function Dot({ className }: { className: string }) {
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle ${className}`}
    />
  )
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}