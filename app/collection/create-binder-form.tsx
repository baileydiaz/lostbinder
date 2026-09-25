'use client'

import { useActionState } from 'react'
import { createBinder, type CreateBinderState } from './binder-actions'

const initialState: CreateBinderState = { error: '' }

export default function CreateBinderForm({ hasDreamBinder }: { hasDreamBinder: boolean }) {
  const [state, action, pending] = useActionState(createBinder, initialState)
  return (
    <form action={action} className="mt-6 grid gap-3 sm:grid-cols-2">
      <input name="title" required maxLength={60} placeholder="Binder name"
        className="rounded-lg border border-white/20 bg-black p-3 text-sm" />
      <select name="kind" className="rounded-lg border border-white/20 bg-black p-3 text-sm">
        <option value="custom">Custom Binder</option>
        <option value="dream" disabled={hasDreamBinder}>Dream Binder (nine cards){hasDreamBinder ? ' — already created' : ''}</option>
      </select>
      <textarea name="description" maxLength={500} rows={2} placeholder="Description (optional)"
        className="rounded-lg border border-white/20 bg-black p-3 text-sm sm:col-span-2" />
      {state.error && <p role="alert" aria-live="polite" className="rounded-lg border border-red-500/30 bg-red-950/30 p-3 text-sm text-red-300 sm:col-span-2">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50 sm:col-span-2 sm:justify-self-start">
        {pending ? 'Creating…' : 'Create binder'}
      </button>
    </form>
  )
}
