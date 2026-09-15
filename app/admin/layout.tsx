'use client'

import { LogoutButton } from '@/components/logout-button'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <header className="border-b border-neutral-200/80 sticky top-0 bg-white/80 backdrop-blur z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 h-14 flex items-center justify-between gap-3">
          <span className="font-semibold tracking-tight">Systemised Maths</span>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-neutral-500">Admin View</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}