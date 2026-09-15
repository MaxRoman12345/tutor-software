'use client'

import { useRef, useState } from 'react'
import { isoToUk, ukToIso } from '@/lib/date'

/**
 * UK date field: shows and accepts dd/mm/yyyy, but its `value`/`onChange` speak
 * ISO yyyy-mm-dd so storage and the rest of the app are unchanged. A calendar
 * button opens the native date picker (via showPicker) for convenience, while
 * the visible text always reads dd/mm/yyyy regardless of OS locale.
 */
export function DateInput({
  value,
  onChange,
  className = '',
}: {
  /** ISO yyyy-mm-dd, or '' when unset. */
  value: string
  onChange: (iso: string) => void
  className?: string
}) {
  const [text, setText] = useState(() => isoToUk(value))
  const [lastValue, setLastValue] = useState(value)
  const nativeRef = useRef<HTMLInputElement>(null)

  // Reconcile during render (React's recommended alternative to a setState
  // effect): when the ISO value changes from outside, reflect it in the text -
  // but partial/invalid typing never changes `value`, so it won't fight typing.
  if (value !== lastValue) {
    setLastValue(value)
    setText(isoToUk(value))
  }

  const commit = (raw: string) => {
    setText(raw)
    const iso = ukToIso(raw)
    if (iso) onChange(iso)
    else if (raw.trim() === '') onChange('')
  }

  const openPicker = () => {
    const el = nativeRef.current
    if (!el) return
    // showPicker() is the reliable way to pop the calendar; fall back to focus.
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.focus()
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={(e) => commit(e.target.value)}
        className="w-32 bg-transparent outline-none font-mono"
      />
      <button
        type="button"
        onClick={openPicker}
        className="text-neutral-400 hover:text-neutral-700 transition shrink-0"
        title="Pick a date"
        aria-label="Pick a date"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2 6h12M5 2v2M11 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {/* Hidden native picker - its value drives the field, but it's never shown
          (so the OS-locale mm/dd/yyyy rendering is never visible). */}
      <input
        ref={nativeRef}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setText(isoToUk(e.target.value))
        }}
        tabIndex={-1}
        aria-hidden
        className="sr-only absolute right-0 bottom-0 h-0 w-0 opacity-0 pointer-events-none"
      />
    </div>
  )
}
