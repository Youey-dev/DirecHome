/**
 * DirectHome BC - Supabase & PostgreSQL Architecture
 * 
 * Provides drop-in Supabase client initialization, database schema definitions,
 * Row Level Security (RLS) policies, and private storage bucket references.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Clean base URL if user copied the REST endpoint
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').trim();

export const SUPABASE_CONFIG = {
  url: cleanUrl,
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
};

export const isSupabaseConfigured = Boolean(
  SUPABASE_CONFIG.url &&
  SUPABASE_CONFIG.anonKey &&
  SUPABASE_CONFIG.url.startsWith('https://') &&
  !SUPABASE_CONFIG.url.includes('your-project') &&
  !SUPABASE_CONFIG.url.includes('demo-app')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;


/**
 * SQL Schema & Storage Setup Definition for production migration:
 * 
 * ```sql
 * -- 1. Profiles
 * create table public.profiles (
 *   id uuid references auth.users not null primary key,
 *   email text not null,
 *   full_name text,
 *   phone text,
 *   role text check (role in ('buyer', 'seller', 'admin')) default 'buyer',
 *   created_at timestamptz default now()
 * );
 * 
 * -- 2. Listings
 * create table public.listings (
 *   id uuid default gen_random_uuid() primary key,
 *   user_id uuid references public.profiles(id) not null,
 *   status text check (status in ('draft', 'in_review', 'live', 'paused', 'sold', 'rejected')) default 'draft',
 *   street_address text not null,
 *   unit_number text,
 *   city text not null,
 *   province text default 'BC',
 *   postal_code text not null,
 *   neighborhood text,
 *   lat double precision,
 *   lng double precision,
 *   property_type text not null,
 *   price numeric not null,
 *   bedrooms integer not null,
 *   bathrooms numeric not null,
 *   sqft integer not null,
 *   lot_sqft integer,
 *   lot_acres numeric,
 *   year_built integer not null,
 *   parking_spaces integer default 1,
 *   strata_fee numeric default 0,
 *   property_taxes_annual numeric,
 *   offers_cashback boolean default true,
 *   cashback_type text default 'fixed',
 *   cashback_amount numeric default 0,
 *   headline text not null,
 *   description text not null,
 *   neighborhood_highlights text,
 *   recent_upgrades jsonb default '[]'::jsonb,
 *   inclusions jsonb default '[]'::jsonb,
 *   -- Subscription & Billing Architecture (Future-Ready: Free for MVP Launch)
 *   subscription_tier text default 'free_launch',
 *   monthly_fee_cad numeric default 0,
 *   billing_cycle text default 'free_launch',
 *   next_billing_at timestamptz,
 *   payment_status text default 'complimentary_launch',
 *   created_at timestamptz default now(),
 *   updated_at timestamptz default now()
 * );
 * 
 * -- 3. Listing Photos
 * create table public.listing_photos (
 *   id uuid default gen_random_uuid() primary key,
 *   listing_id uuid references public.listings(id) on delete cascade,
 *   storage_path text not null,
 *   thumbnail_path text not null,
 *   caption text,
 *   sort_order integer default 0,
 *   is_cover boolean default false
 * );
 * 
 * -- 4. Private Ownership Verification Documents
 * -- Buckets:
 * -- 'public_listing_photos' (public read, authenticated insert)
 * -- 'private_verification_docs' (PRIVATE bucket: only owner insert/select, admin read)
 * create table public.verification_documents (
 *   id uuid default gen_random_uuid() primary key,
 *   listing_id uuid references public.listings(id) on delete cascade,
 *   file_path text not null, -- stored in private_verification_docs bucket
 *   document_type text check (document_type in ('property_tax_notice', 'land_title_search', 'bc_assessment', 'other')),
 *   status text default 'pending',
 *   created_at timestamptz default now()
 * );
 * 
 * -- 5. Row Level Security Policies
 * alter table public.listings enable row level security;
 * alter table public.verification_documents enable row level security;
 * 
 * create policy "Public can view live listings"
 *   on public.listings for select
 *   using (status = 'live' or auth.uid() = user_id or auth.jwt()->>'role' = 'admin');
 * 
 * create policy "Sellers manage own listings"
 *   on public.listings for all
 *   using (auth.uid() = user_id);
 * 
 * create policy "Private docs only visible to owner and admin"
 *   on public.verification_documents for select
 *   using (
 *     exists (select 1 from public.listings where id = listing_id and user_id = auth.uid())
 *     or auth.jwt()->>'role' = 'admin'
 *   );
 * ```
 */

export const SUPABASE_ARCHITECTURE_NOTE = 
  'DirectHome BC is architected for clean client and server parity with Supabase Postgres + Storage + RLS.';
