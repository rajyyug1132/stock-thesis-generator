'use client';

import { ErrorCard } from '@/components/ui/error-card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        <ErrorCard
          label="ERROR · THESIS FAILED TO LOAD"
          message={error.message || 'Something went wrong generating this thesis.'}
          onRetry={reset}
        />
      </div>
    </main>
  );
}
