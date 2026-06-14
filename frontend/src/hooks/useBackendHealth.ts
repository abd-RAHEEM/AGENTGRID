'use client';
import { useEffect } from 'react';
import { useEnergyStore } from '../store/useEnergyStore';

export function useBackendHealth() {
  const setBackendConnected = useEnergyStore((s) => s.setBackendConnected);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(`${BACKEND_URL}/health`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (mounted) setBackendConnected(res.ok);
      } catch {
        if (mounted) setBackendConnected(false);
      }
    };

    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [BACKEND_URL, setBackendConnected]);
}
