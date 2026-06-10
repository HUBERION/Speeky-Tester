import { useCallback, useEffect, useState } from 'react';
import { ensureDefaultSession, setActiveSessionId } from '../db';
import type { TestSession } from '../types';

export function useSession() {
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const s = await ensureDefaultSession();
    setSession(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchSession = useCallback(async (id: number) => {
    await setActiveSessionId(id);
    await refresh();
  }, [refresh]);

  return { session, loading, refresh, switchSession, activeSessionId: session?.id };
}
