import React from 'react';

/** Shown instead of the app when the Supabase connection settings are missing. */
export const SetupNotice: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="max-w-lg rounded-2xl bg-white p-8 shadow-lg border border-slate-200">
      <h1 className="text-xl font-bold text-slate-900">DirectHome BC is not connected yet</h1>
      <p className="mt-3 text-sm text-slate-600">
        The site could not find its database settings. In your hosting dashboard (Netlify or Vercel), add these two
        environment variables and redeploy:
      </p>
      <ul className="mt-3 space-y-1 text-sm font-mono text-slate-800">
        <li>VITE_SUPABASE_URL</li>
        <li>VITE_SUPABASE_ANON_KEY</li>
      </ul>
      <p className="mt-3 text-sm text-slate-600">
        Both values are in Supabase under Project Settings → API (use the “anon / public” key only).
      </p>
    </div>
  </div>
);
