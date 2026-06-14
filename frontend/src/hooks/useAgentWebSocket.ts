'use client'
import { useEffect } from 'react'
import { useEnergyStore } from '@/store/useEnergyStore'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

/**
 * Pings backend on mount and sets backendConnected in the store.
 * Call this once from page.tsx.
 */
export function useBackendHealth() {
  const setBackendConnected = useEnergyStore(s => s.setBackendConnected)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`, {
          signal: AbortSignal.timeout(3000)
        })
        setBackendConnected(res.ok)
      } catch {
        setBackendConnected(false)
      }
    }

    check()
    const interval = setInterval(check, 30000)  // re-check every 30s
    return () => clearInterval(interval)
  }, [setBackendConnected])
}
