import React from 'react';
import { reportError } from '../lib/monitoring';

/**
 * Last line of defence: if a page crashes while drawing, show a friendly message with a
 * reload button instead of a blank screen, and report the error (when monitoring is on).
 *
 * The most common cause after a new deploy is an old tab asking for a page file that no
 * longer exists; reloading fixes it, so that case reloads once by itself.
 */
const RELOAD_KEY = 'om-chunk-reload';

const isStaleChunk = (e: unknown) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    String((e as Error)?.message ?? e),
  );

interface State {
  error: unknown;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    if (isStaleChunk(error)) {
      try {
        if (!sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, '1');
          window.location.reload();
          return;
        }
      } catch {
        /* storage blocked: fall through to the message */
      }
    }
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-slate-900">Something went wrong on this page</h1>
          <p className="mt-2 text-sm text-slate-600">
            Please reload and try again. If it keeps happening, email{' '}
            <a href="mailto:hello@ownersmarket.ca" className="underline underline-offset-2">
              hello@ownersmarket.ca
            </a>
            .
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Reload
            </button>
            <a href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Go to home page
            </a>
          </div>
        </div>
      </div>
    );
  }
}
