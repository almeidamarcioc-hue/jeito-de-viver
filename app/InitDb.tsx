'use client'

import { useEffect } from 'react'

export default function InitDb() {
  useEffect(() => {
    fetch('/api/init').catch(() => {})
  }, [])
  return null
}
