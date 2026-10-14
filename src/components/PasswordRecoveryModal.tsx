import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Shown after someone clicks the "reset your password" link in their email. */
export const PasswordRecoveryModal: React.FC = () => {
  const { updatePassword, dismissRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw !== pw2) return setError('The two passwords do not match.');
    setBusy(true);
    const res = await updatePassword(pw);
    setBusy(false);
    if (!res.success) setError(res.error || 'Could not update your password.');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <KeyRound className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-bold">Choose a new password</h2>
          </div>
          <button type="button" onClick={dismissRecovery} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="New password (at least 10 characters)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="Repeat new password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </div>
  );
};
