'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken]     = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string) {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  }

  async function signOut() {
    await getSupabaseClient().auth.signOut();
  }

  return { user, token, loading, signIn, signOut };
}
