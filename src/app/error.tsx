'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <div className="animate-fade-up max-w-md space-y-6 rounded-2xl border border-white/10 bg-panel/95 p-8 shadow-glow">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Error</p>
          <h1 className="text-3xl font-semibold text-white">Something went wrong</h1>
          <p className="text-sm leading-6 text-muted">
            {error?.message?.includes('fetch failed')
              ? 'Cannot reach the backend server. Make sure it is running on port 8000.'
              : 'An unexpected error occurred. Try refreshing the page.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="no-min-h rounded-lg bg-[#114a70] border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1a5b87]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="no-min-h rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
