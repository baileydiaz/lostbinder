'use client'

import { useState, type ReactNode } from 'react'

export default function BinderSettingsPanel({ children, initiallyOpen = false }: { children: ReactNode; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <section className="mt-5">
      <button type="button" aria-expanded={open} aria-controls="binder-settings-panel"
        onClick={() => setOpen(value => !value)}
        className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/50 hover:text-white">
        {open ? 'Close settings' : 'Binder settings'}
      </button>
      {open && <div id="binder-settings-panel" className="mt-4 rounded-xl border border-white/10 bg-zinc-950 p-5 sm:p-6">{children}</div>}
    </section>
  )
}
