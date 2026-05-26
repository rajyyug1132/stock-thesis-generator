'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.replace('/portfolio?restore=pending');
      }
    });
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-canvas)' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small)', color: 'var(--text-tertiary)', letterSpacing: '0.1em' }}>
        AUTHENTICATING…
      </p>
    </main>
  );
}
