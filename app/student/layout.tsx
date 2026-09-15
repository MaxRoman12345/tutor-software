'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LogoutButton } from '@/components/logout-button'

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
      <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/student/materials', label: 'Materials' },
    { href: '/student/lessons', label: 'Lessons' },
    { href: '/student/homework', label: 'Homework' },
  ]

  return (
    <div className="min-h-svh bg-white text-neutral-900">
      <header className="border-b border-neutral-200/80 sticky top-0 bg-white/80 backdrop-blur z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 h-14 flex items-center justify-between gap-3">
          <span className="font-semibold tracking-tight shrink-0 hidden sm:inline">
            Systemised Maths
          </span>

            <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition shrink-0"
          >
            <MenuIcon />
          </button>

          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <nav className="hidden sm:flex items-center gap-1 text-sm overflow-x-auto min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full transition shrink-0 ${pathname.startsWith(item.href)
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>
        </div>

        {menuOpen && (
          <>
            <div
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 sm:hidden"
            />
            <nav className="absolute inset-x-0 top-full z-50 border-b border-neutral-200/80 bg-white p-2 shadow-sm sm:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${pathname.startsWith(item.href)
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-5 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
