/**
 * Supabase client for DirectHome BC.
 *
 * Only the PUBLIC project URL and the public "anon" key belong in the browser.
 * Never put the service_role key in any VITE_ variable — it would be visible to everyone.
 * All data access is protected by the Row Level Security rules in supabase/migrations.
 */
import { createClient } from '@supabase/supabase-js';

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
// Accept the URL even if it was pasted with a trailing slash or /rest/v1
const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured =
  url.startsWith('https://') && !url.includes('your-project') && anonKey.length > 30 && !anonKey.includes('your-anon');

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://not-configured.invalid',
  isSupabaseConfigured ? anonKey : 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const PHOTO_BUCKET = 'public_listing_photos';
