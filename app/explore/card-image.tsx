'use client'

import { useState } from 'react'

type Props = {
  src: string
  alt: string
  onBroken?: () => void
}

export default function CardImage({
  src,
  alt,
  onBroken,
}: Props) {
  const [broken, setBroken] = useState(false)

  if (broken) {
    return null
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        setBroken(true)
        onBroken?.()
      }}
      style={{
        width: '100%',
        display: 'block',
        borderRadius: '12px',
      }}
    />
  )
}