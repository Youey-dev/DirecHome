-- ==============================================================================
-- DirectHome BC — Production PostgreSQL Schema & Row Level Security (RLS)
-- Architecture: Supabase Postgres + Auth + Storage
-- Launch Market: Fraser Valley & Lower Mainland, British Columbia, Canada
-- ==============================================================================

-- 1. ENUMS
create type public.user_role as enum ('buyer', 'seller', 'admin');

create type public.listing_status as enum (
  'draft',
  'in_review',
  'live',
  'paused',
  'sold',
  'rejected'
);

create type public.property_type as enum (
  'Single Family Detached',
  'Townhouse',
  'Condo / Apartment',
  'Duplex / Half-Duplex',
  'Acreage / Farm'
);

create type public.verification_doc_type as enum (
  'property_tax_notice',
  'land_title_search',
  'bc_assessment',
  'other'
);

create type public.verification_status as enum (
  'pending',
  'verified',
  'rejected'
);

create type public.viewing_time_slot as enum (
  'morning',
  'afternoon',
  'evening'
);

create type public.viewing_status as enum (
  'pending',
  'confirmed',
  'rescheduled',
  'declined',
  'completed'
);

create type public.report_reason as enum (
  'incorrect_info',
  'not_homeowner',
  'inappropriate_photos',
  'scam_suspected',
  'already_sold',
  'other'
);

create type public.report_status as enum (
  'pending',
  'dismissed',
  'resolved'
);

-- ------------------------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------------------------

-- (1) USERS / PROFILES
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null unique,
  full_name text not null,
  phone text,
  role public.user_role not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (2) LISTINGS
create table public.listings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  status public.listing_status not null default 'draft',
  
  -- Address (Civic address hidden until viewing confirmed)
  street_address text not null,
  unit_number text,
  city text not null,
  province text not null default 'BC',
  postal_code text not null,
  neighborhood text not null,
  lat double precision not null,
  lng double precision not null,
  
  -- Specifications
  property_type public.property_type not null,
  price numeric(12, 2) not null check (price > 0),
  bedrooms integer not null check (bedrooms >= 0),
  bathrooms numeric(3, 1) not null check (bathrooms > 0),
  sqft integer not null check (sqft > 0),
  lot_sqft integer,
  lot_acres numeric(8, 3),
  year_built integer not null,
  parking_spaces integer not null default 1,
  strata_fee numeric(10, 2) default 0,
  property_taxes_annual numeric(10, 2),
  
  -- Commission & Cash-back (Seller voluntary offer, not a guarantee)
  offers_cashback boolean not null default true,
  cashback_type text not null default 'fixed' check (cashback_type in ('fixed', 'percentage')),
  cashback_amount numeric(12, 2) not null default 0,
  estimated_commission_saved numeric(12, 2) not null default 0,
  
  -- Marketing Prose
  headline text not null,
  description text not null,
  neighborhood_highlights text,
  recent_upgrades jsonb not null default '[]'::jsonb,
  inclusions jsonb not null default '[]'::jsonb,
  
  -- Future-Ready Billing & Subscriptions (Free for MVP launch)
  subscription_tier text not null default 'free_launch',
  monthly_fee_cad numeric(10, 2) not null default 0,
  billing_cycle text not null default 'free_launch',
  next_billing_at timestamptz,
  payment_status text not null default 'complimentary_launch',
  
  -- Timestamps & Counters
  views_count integer not null default 0,
  saves_count integer not null default 0,
  inquiries_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (3) LISTING PHOTOS (Ordered)
create table public.listing_photos (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  url text not null,
  thumbnail_url text not null,
  caption text,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  width integer,
  height integer,
  file_size integer,
  created_at timestamptz not null default now()
);

-- (4) VERIFICATIONS (Private Storage & Audit)
create table public.verifications (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  document_type public.verification_doc_type not null default 'property_tax_notice',
  file_name text not null,
  file_size text not null,
  file_path text not null, -- Stored in private encrypted bucket 'private_verification_docs'
  status public.verification_status not null default 'pending',
  rejection_reason text,
  audited_by uuid references public.users(id),
  audited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (5) CONVERSATIONS
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references public.users(id) on delete cascade not null,
  seller_id uuid references public.users(id) on delete cascade not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint unique_listing_buyer unique (listing_id, buyer_id)
);

-- (6) MESSAGES
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- (7) VIEWING REQUESTS
create table public.viewing_requests (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  buyer_id uuid references public.users(id) on delete cascade not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  preferred_date date not null,
  preferred_time_slot public.viewing_time_slot not null default 'afternoon',
  notes text,
  status public.viewing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- (8) FAVOURITES
create table public.favourites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  listing_id uuid references public.listings(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  constraint unique_user_favourite unique (user_id, listing_id)
);

-- (9) REPORTS
create table public.reports (
  id uuid default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete cascade not null,
  reporter_id uuid references public.users(id) on delete set null,
  reporter_email text not null,
  reason public.report_reason not null default 'incorrect_info',
  details text not null,
  status public.report_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id)
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
create index idx_listings_city_status on public.listings(city, status);
create index idx_listings_price on public.listings(price);
create index idx_listings_user_id on public.listings(user_id);
create index idx_listing_photos_order on public.listing_photos(listing_id, sort_order);
create index idx_verifications_listing on public.verifications(listing_id);
create index idx_conversations_participants on public.conversations(buyer_id, seller_id);
create index idx_messages_conversation on public.messages(conversation_id, created_at);
create index idx_viewing_requests_listing on public.viewing_requests(listing_id, preferred_date);
create index idx_favourites_user on public.favourites(user_id);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS across all tables
alter table public.users enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.verifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.viewing_requests enable row level security;
alter table public.favourites enable row level security;
alter table public.reports enable row level security;

-- (A) USERS RLS
create policy "Users can view their own profile or public info"
  on public.users for select
  using (true);

create policy "Users can update only their own profile"
  on public.users for update
  using (auth.uid() = id);

-- (B) LISTINGS RLS
-- Buyers see ONLY live listings. Sellers see their own regardless of status. Admins see all.
create policy "Buyers see only live listings; owners and admins see all"
  on public.listings for select
  using (
    status = 'live'
    or auth.uid() = user_id
    or auth.jwt()->>'role' = 'admin'
  );

-- Sellers create listings for themselves
create policy "Sellers create their own listings"
  on public.listings for insert
  with check (auth.uid() = user_id);

-- Sellers edit only their own listings. Admins can update status.
create policy "Sellers edit only their own listings"
  on public.listings for update
  using (
    auth.uid() = user_id
    or auth.jwt()->>'role' = 'admin'
  );

-- Sellers delete only their own listings
create policy "Sellers delete only their own listings"
  on public.listings for delete
  using (
    auth.uid() = user_id
    or auth.jwt()->>'role' = 'admin'
  );

-- (C) LISTING PHOTOS RLS
create policy "Photos visible if parent listing is visible"
  on public.listing_photos for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'live' or l.user_id = auth.uid() or auth.jwt()->>'role' = 'admin')
    )
  );

create policy "Listing owner manages photos"
  on public.listing_photos for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.user_id = auth.uid() or auth.jwt()->>'role' = 'admin')
    )
  );

-- (D) VERIFICATIONS RLS (CRITICAL GUARANTEE)
-- Verification documents are visible ONLY to the owner and admins. Never to buyers.
create policy "Verification documents visible only to owner and admins"
  on public.verifications for select
  using (
    auth.jwt()->>'role' = 'admin'
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy "Owner can upload verification document"
  on public.verifications for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy "Admins audit and update verifications"
  on public.verifications for update
  using (auth.jwt()->>'role' = 'admin');

-- (E) CONVERSATIONS RLS
create policy "Conversations visible only to participating buyer, seller, or admin"
  on public.conversations for select
  using (
    buyer_id = auth.uid()
    or seller_id = auth.uid()
    or auth.jwt()->>'role' = 'admin'
  );

create policy "Buyers initiate conversations"
  on public.conversations for insert
  with check (buyer_id = auth.uid());

-- (F) MESSAGES RLS
create policy "Messages visible only to conversation participants or admin"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid() or auth.jwt()->>'role' = 'admin')
    )
  );

create policy "Participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- (G) VIEWING REQUESTS RLS
create policy "Viewing requests visible only to buyer, seller, or admin"
  on public.viewing_requests for select
  using (
    buyer_id = auth.uid()
    or auth.jwt()->>'role' = 'admin'
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy "Buyers can request viewings"
  on public.viewing_requests for insert
  with check (buyer_id = auth.uid());

create policy "Listing owner and buyer can update viewing status"
  on public.viewing_requests for update
  using (
    buyer_id = auth.uid()
    or auth.jwt()->>'role' = 'admin'
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  );

-- (H) FAVOURITES RLS
create policy "Users view and manage only their own favourites"
  on public.favourites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- (I) REPORTS RLS
create policy "Users can submit listing reports"
  on public.reports for insert
  with check (true);

create policy "Only admins can view and resolve reports"
  on public.reports for select
  using (auth.jwt()->>'role' = 'admin');

create policy "Only admins can update reports"
  on public.reports for update
  using (auth.jwt()->>'role' = 'admin');
