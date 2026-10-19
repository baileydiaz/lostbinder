'use client'

import { useState } from 'react'

export default function PasswordInput({ name = 'password', placeholder = 'Password', minLength = 12 }: { name?: string; placeholder?: string; minLength?: number }) {
  const [visible, setVisible] = useState(false)
  return <div className="flex overflow-hidden rounded-lg border border-white/20 bg-zinc-900">
    <input name={name} type={visible ? 'text' : 'password'} placeholder={placeholder} required minLength={minLength} autoComplete={name === 'password' ? 'new-password' : 'new-password'} className="min-w-0 flex-1 bg-transparent p-3 text-white" />
    <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} className="px-4 text-sm text-zinc-300">{visible ? 'Hide' : 'Show'}</button>
  </div>
}
