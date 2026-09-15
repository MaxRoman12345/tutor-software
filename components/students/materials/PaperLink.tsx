'use client'

import { pdfUrl } from './types'

/**
 * Renders a past-paper label as plain text, with small "QP | MS" buttons
 * alongside - only those buttons open a paper (in a new tab); the label
 * itself is not clickable. Buttons are omitted if the paper has no PDFs
 * attached.
 */
export function PaperLink({
  label,
  qpPath,
  msPath,
  className = '',
}: {
  label: string
  qpPath: string | null | undefined
  msPath: string | null | undefined
  className?: string
}) {
  const qpUrl = pdfUrl(qpPath ?? null)
  const msUrl = pdfUrl(msPath ?? null)

  if (!qpUrl && !msUrl) {
    return <span className={className}>{label}</span>
  }

  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={className}>{label}</span>
      <span className="text-[10px] text-neutral-400 whitespace-nowrap">
        (
        {qpUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              window.open(qpUrl, '_blank')
            }}
            className="hover:text-neutral-700 hover:underline transition"
          >
            QP
          </button>
        )}
        {qpUrl && msUrl && ' | '}
        {msUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              window.open(msUrl, '_blank')
            }}
            className="hover:text-neutral-700 hover:underline transition"
          >
            MS
          </button>
        )}
        )
      </span>
    </span>
  )
}
