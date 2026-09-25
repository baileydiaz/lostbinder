'use client'
import { useFormStatus } from 'react'
export default function SaveBinderButton() {
  const { pending } = useFormStatus()
  return <button disabled={pending} className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">{pending ? 'Saving…' : 'Save settings'}</button>
}
