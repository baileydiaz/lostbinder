'use client'

import { useState } from 'react'
import CreateBinderForm from './create-binder-form'

export default function CreateBinderPanel({ hasDreamBinder }: { hasDreamBinder: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-controls="create-binder-panel"
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
      >
        <span aria-hidden="true">{open ? '−' : '+'}</span>
        {open ? 'Cancel' : 'Create binder'}
      </button>
      {open && (
        <div id="create-binder-panel" className="mt-4 max-w-xl rounded-xl border border-white/10 bg-black p-4 sm:p-5">
          <h3 className="text-lg font-semibold">New binder</h3>
          <p className="mt-1 text-sm text-zinc-500">Make a custom collection or your nine-card Dream Binder.</p>
          <CreateBinderForm hasDreamBinder={hasDreamBinder} />
          <p className="mt-3 text-xs text-zinc-600">One Dream Binder per account. New binders are private by default.</p>
        </div>
      )}
    </div>
  )
}
