/**
 * OwnersMarket — data layer (Supabase)
 *
 * Replaces the old browser-only localStorage store. Everything a person is allowed
 * to see is loaded from Supabase into a small in-memory cache that the pages read
 * synchronously. All writes go to Supabase first and then refresh the cache.
 *
 * SECURITY NOTE: this file is a convenience layer, not a security boundary.
 * The real protection is the Row Level Security + triggers in supabase/migrations
 * (002_security_hardening.sql). Even if someone edits this code in their browser,
 * the database still refuses anything they are not allowed to do.
 */
import { trackEvent } from './analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, PHOTO_BUCKET } from './supabase';
import { stripHtml, stripHtmlKeepLines } from './security';
import { editNeedsReview, withPendingEdit } from './reviewRules';
export { withPendingEdit };
import { agentOfferColumns } from './agentCommission';
import { deleteDraftPhotos, moveDraftPhotos } from './draftPhotos';
import type {
  AppNotification,
  Listing,
  ListingReport,
  ListingStatus,
  ConversationThread,
  PendingEdit,
  PhotoItem,
  PropertyType,
  UserProfile,
  ViewingRequest,
} from '../types/listing';

type Row = Record<string, any>;

export const TERMS_VERSION = '2026-10-14'; // Canada-wide terms; ownership is not verified

export const GUEST_USER: UserProfile = {
  id: 'guest',
  email: '',
  name: 'Guest',
  role: 'guest',
  isGuest: true,
};

export const isGuestUser = (user: UserProfile | null | undefined): boolean =>
  !user || user.isGuest === true || user.role === 'guest' || !user.email;

/** Everything the wizard sends when a seller submits or edits a listing. */
export interface ListingSubmission {
  id?: string; // present when editing an existing listing
  streetAddress: string;
  unitNumber?: string;
  postalCode: string;
  city: string;
  /** Two-letter province or territory code, e.g. 'BC', 'ON'. */
  province: string;
  neighborhood: string;
  lat: number;
  lng: number;
  propertyType: PropertyType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft?: number;
  lotAcres?: number;
  yearBuilt: number;
  parkingSpaces: number;
  strataFee?: number;
  propertyTaxesAnnual?: number;
  offersCashback: boolean;
  cashbackType: 'fixed' | 'percentage';
  cashbackAmount: number;
  estimatedCommissionSaved: number;
  agentsWelcome?: boolean;
  /** Show the exact address on the public listing. */
  showAddress?: boolean;
  agentCommissionType?: 'percent' | 'fixed' | 'negotiable';
  agentCommissionValue?: number;
  headline: string;
  description: string;
  neighborhoodHighlights?: string;
  recentUpgrades: string[];
  inclusions: string[];
  photos: PhotoItem[]; // already-uploaded photos have http(s) URLs, new ones are data: URLs
}

const num = (v: unknown): number | undefined => (v === null || v === undefined ? undefined : Number(v));

const humanSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

const fail = (error: { message?: string } | null | undefined, fallback = 'Something went wrong. Please try again.'): never => {
  throw new Error(error?.message || fallback);
};

/** "https://x.supabase.co/storage/v1/object/public/<bucket>/<path>" -> "<path>" */
const pathFromPublicUrl = (url: string): string | null => {
  const marker = `/${PHOTO_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
};

/** Turns a row of listing_pending_edits into the app's shape. */
function mapPendingEdit(r: Row): PendingEdit {
  const photos: PhotoItem[] = (Array.isArray(r.photos) ? r.photos : []).map((p: Row) => ({
    id: String(p.id),
    url: p.url,
    thumbnailUrl: p.thumbnail_url ?? p.url,
    caption: p.caption ?? undefined,
    isCover: !!p.is_cover,
    width: p.width ?? undefined,
    height: p.height ?? undefined,
    fileSize: p.file_size ?? undefined,
  }));
  return {
    status: r.status === 'rejected' ? 'rejected' : 'pending',
    reviewNotes: r.review_notes ?? undefined,
    headline: r.headline,
    description: r.description,
    neighborhood: r.neighborhood,
    neighborhoodHighlights: r.neighborhood_highlights ?? undefined,
    recentUpgrades: Array.isArray(r.recent_upgrades) ? r.recent_upgrades : [],
    inclusions: Array.isArray(r.inclusions) ? r.inclusions : [],
    city: r.city,
    province: r.province,
    postalFsa: r.postal_fsa ?? undefined,
    lat: Number(r.lat),
    lng: Number(r.lng),
    streetAddress: r.street_address,
    unitNumber: r.unit_number ?? undefined,
    postalCode: r.postal_code,
    photos,
    updatedAt: r.updated_at,
  };
}


/** Photo files in a pending edit that the live listing doesn't use (uploaded for the edit only). */
const pendingOnlyFiles = (edit: PendingEdit | undefined, live: PhotoItem[], keep: PhotoItem[] = []): string[] => {
  if (!edit) return [];
  const used = new Set([...live, ...keep].flatMap((p) => [p.url, p.thumbnailUrl]));
  return edit.photos
    .flatMap((p) => [p.url, p.thumbnailUrl])
    .filter((u) => u && !used.has(u))
    .map(pathFromPublicUrl)
    .filter((p): p is string => !!p);
};

/**
 * Listing columns anyone may read. Billing and review-note fields are private: owners and admins
 * get them from my_listing_private_fields() (migration 011).
 */
const LISTING_COLUMNS = [
  'id', 'user_id', 'status', 'city', 'province', 'neighborhood', 'postal_fsa', 'lat', 'lng',
  'property_type', 'price', 'bedrooms', 'bathrooms', 'sqft', 'lot_sqft', 'lot_acres', 'year_built',
  'parking_spaces', 'strata_fee', 'property_taxes_annual',
  'offers_cashback', 'cashback_type', 'cashback_amount', 'estimated_commission_saved',
  'headline', 'description', 'neighborhood_highlights', 'recent_upgrades', 'inclusions',
  'views_count', 'saves_count', 'inquiries_count', 'created_at', 'updated_at', 'admin_hold',
  'agents_welcome', 'agent_commission_type', 'agent_commission_value', 'show_address',
].join(',');

/** The exact address (owner, admins, buyers with a confirmed viewing, or everyone when the owner shows it). */
const PRIVATE_DETAIL_COLUMNS = 'listing_id,street_address,unit_number,postal_code,exact_lat,exact_lng';

/** The name sellers see on messages from the OwnersMarket admin. */
export const ADMIN_DISPLAY_NAME = 'Charles - Admin';

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  createdAt: string;
  marketingOptIn: boolean;
}

const OWNER_FIELDS =
  'id,payment_status,past_due_since,cancel_at_period_end,next_billing_at,subscription_tier,billing_cycle,monthly_fee_cad,review_notes';

/** True when a database function isn't there yet (the site was published before its migration ran). */
const isMissingFunction = (error: { code?: string } | null | undefined) =>
  !!error && (error.code === 'PGRST202' || error.code === '42883');

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

class DataStore {
  private user: UserProfile = GUEST_USER;
  private userVersion = 0;
  private listings: Listing[] = [];
  private savedIds: string[] = [];
  private viewings: ViewingRequest[] = [];
  private threads: ConversationThread[] = [];
  private reports: ListingReport[] = [];
  private notifications: AppNotification[] = [];
  private announced = new Set<string>();
  private notificationsPrimed = false;
  private notifSignature = '';
  private incomingListeners = new Set<(n: AppNotification) => void>();
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<() => void>();
  private refreshing: Promise<void> | null = null;
  private refreshQueued = false;
  private loaded = false;
  private loadError: string | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      // Keep data fresh when the person comes back to the tab
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.refresh();
      });
      window.addEventListener('online', () => void this.refresh());
      // Lightweight check every 30 seconds as a safety net behind the live updates:
      // it only does a full reload when something new has arrived.
      setInterval(() => void this.pollNotifications(), 30_000);
    }
  }

  // ---------------------------------------------------------------------------
  // Subscription + simple getters (read from the in-memory cache)
  // ---------------------------------------------------------------------------
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  isLoaded() {
    return this.loaded;
  }
  getLoadError() {
    return this.loadError;
  }
  getListings(): Listing[] {
    return this.listings;
  }
  getListingById(id: string): Listing | undefined {
    return this.listings.find((l) => l.id === id);
  }
  getSavedIds(): string[] {
    return this.savedIds;
  }
  getViewingRequests(): ViewingRequest[] {
    return this.viewings;
  }
  getThreads(): ConversationThread[] {
    return this.threads;
  }
  getReports(): ListingReport[] {
    return this.reports;
  }
  getNotifications(): AppNotification[] {
    return this.notifications;
  }
  getUnreadNotificationCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }
  getUnreadMessageCount(): number {
    return this.threads.reduce((sum, t) => sum + t.unreadCount, 0);
  }

  /** Called whenever a brand-new unread notification arrives (used for pop-up banners). */
  onIncomingNotification(listener: (n: AppNotification) => void): () => void {
    this.incomingListeners.add(listener);
    return () => {
      this.incomingListeners.delete(listener);
    };
  }

  private async pollNotifications() {
    if (isGuestUser(this.user) || document.visibilityState !== 'visible') return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id, created_at, read_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !data) return;
    const signature = data.map((n) => `${n.id}:${n.created_at}:${n.read_at ? 1 : 0}`).join('|');
    if (signature !== this.notifSignature) await this.refresh();
  }

  private startRealtime() {
    this.stopRealtime();
    if (isGuestUser(this.user)) return;
    const id = this.user.id;
    this.channel = supabase
      .channel(`notifications:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${id}` },
        () => void this.refresh()
      )
      .subscribe();
  }

  private stopRealtime() {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Who is signed in (set by AuthContext)
  // ---------------------------------------------------------------------------
  setUser(user: UserProfile) {
    const changed = user.id !== this.user.id || user.role !== this.user.role;
    // Someone who started a listing while signed out keeps it when they sign in or sign up
    if (changed && isGuestUser(this.user) && !isGuestUser(user)) this.adoptGuestDraft(user.id);
    this.user = user;
    if (!changed && this.loaded) return;
    this.userVersion += 1;
    this.listings = [];
    this.savedIds = [];
    this.viewings = [];
    this.threads = [];
    this.reports = [];
    this.notifications = [];
    this.announced = new Set<string>();
    this.notificationsPrimed = false;
    this.notifSignature = '';
    this.loaded = false;
    this.startRealtime();
    this.notify();
    void this.refresh();
  }

  private requireUser(): UserProfile {
    if (isGuestUser(this.user)) throw new Error('Please sign in to continue.');
    return this.user;
  }

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  refresh(): Promise<void> {
    if (this.refreshing) {
      this.refreshQueued = true;
      return this.refreshing;
    }
    this.refreshing = this.doRefresh()
      .catch((err) => {
        console.error('Failed to load data', err);
        this.loadError = err?.message || 'We could not load the latest data.';
        this.loaded = true;
        this.notify();
      })
      .finally(() => {
        this.refreshing = null;
        if (this.refreshQueued) {
          this.refreshQueued = false;
          void this.refresh();
        }
      });
    return this.refreshing;
  }

  private async doRefresh(): Promise<void> {
    const version = this.userVersion;
    const me = this.user;
    const signedIn = !isGuestUser(me);

    const listingRows = await this.loadListings(me, signedIn);

    let privates: Row[] = [];
    let viewingRows: Row[] = [];
    let convoRows: Row[] = [];
    let favRows: Row[] = [];
    let reportRows: Row[] = [];
    let notificationRows: Row[] = [];
    let ownerFieldRows: Row[] = [];
    let pendingRows: Row[] = [];

    if (!signedIn && listingRows.some((l) => l.show_address)) {
      // Visitors: only the addresses owners chose to show (the database returns nothing else)
      const { data, error } = await supabase
        .from('listing_private_details')
        .select(PRIVATE_DETAIL_COLUMNS)
        .in('listing_id', listingRows.filter((l) => l.show_address).map((l) => l.id));
      privates = error ? [] : ((data as Row[]) ?? []);
    }

    if (signedIn) {
      const [p, vr, c, f, r, nt, of] = await Promise.all([
        supabase.from('listing_private_details').select(PRIVATE_DETAIL_COLUMNS),
        supabase.from('viewing_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('conversations').select('*, messages(*)').order('last_message_at', { ascending: false }),
        supabase.from('favourites').select('listing_id'),
        me.role === 'admin'
          ? supabase.from('reports').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Row[], error: null }),
        supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
        // Billing status and review notes: own listings only (admins: all)
        supabase.rpc('my_listing_private_fields'),
      ]);
      for (const res of [p, vr, c, f, r, nt]) if (res.error) throw res.error;
      let ownerFields: { data: unknown; error: { code?: string; message?: string } | null } = of;
      if (isMissingFunction(of.error)) {
        // Before migration 011 these columns are still readable directly
        const q = supabase.from('listings').select(OWNER_FIELDS);
        ownerFields = me.role === 'admin' ? await q : await q.eq('user_id', me.id);
      }
      if (ownerFields.error) throw ownerFields.error;
      privates = p.data ?? [];
      viewingRows = vr.data ?? [];
      convoRows = c.data ?? [];
      favRows = f.data ?? [];
      reportRows = (r.data as Row[]) ?? [];
      notificationRows = nt.data ?? [];
      ownerFieldRows = (ownerFields.data as Row[]) ?? [];

      // Changes waiting for review (own listings; admins: all). Never stops the site loading.
      const pe = await supabase.from('listing_pending_edits').select('*');
      pendingRows = pe.error ? [] : ((pe.data as Row[]) ?? []);
      void this.cleanUpPhotoFiles();
    }

    // Names of people we deal with. Only admins get email and phone; everyone else gets the
    // display name of the people they share a conversation or a viewing with (people_names).
    const userIds = new Set<string>();
    if (signedIn) {
      userIds.add(me.id);
      convoRows.forEach((c) => {
        userIds.add(c.buyer_id);
        userIds.add(c.seller_id);
      });
      viewingRows.forEach((v) => userIds.add(v.buyer_id));
      const listingOwner = new Map(listingRows.map((l) => [l.id, l.user_id as string]));
      viewingRows.forEach((v) => {
        const owner = listingOwner.get(v.listing_id);
        if (owner) userIds.add(owner);
      });
      listingRows.forEach((l) => {
        if (me.role === 'admin' || l.user_id === me.id) userIds.add(l.user_id);
      });
    }
    const people = new Map<string, Row>();
    for (const ids of chunk([...userIds], 80)) {
      let { data, error } =
        me.role === 'admin'
          ? await supabase.from('users').select('id, full_name, email, phone').in('id', ids)
          : await supabase.rpc('people_names', { _ids: ids });
      if (isMissingFunction(error)) {
        // Before migration 011: names only, read directly
        ({ data, error } = await supabase.from('users').select('id, full_name').in('id', ids));
      }
      if (error) throw error;
      ((data as Row[]) ?? []).forEach((u) => people.set(u.id, u));
    }

    if (version !== this.userVersion) return; // someone signed in/out while we were loading

    const privateById = new Map<string, Row>(privates.map((p) => [p.listing_id, p]));
    const ownerFieldsById = new Map<string, Row>(ownerFieldRows.map((o) => [o.id, o]));
    const pendingById = new Map<string, PendingEdit>(pendingRows.map((r) => [r.listing_id, mapPendingEdit(r)]));

    const listings = listingRows.map((row) =>
      this.mapListing(
        {
          ...row,
          // Billing fields are private (owner and admins only). Anyone else can only ever receive a
          // listing the database already considers public (live and paid, or on a free promo), so
          // for them it is shown as live. Without this, visitors saw no listings at all.
          ...(ownerFieldsById.get(row.id) ?? (row.status === 'live' ? { payment_status: 'active' } : {})),
        },
        privateById.get(row.id),
        people.get(row.user_id)
      )
    ).map((l) => (pendingById.has(l.id) ? { ...l, pendingEdit: pendingById.get(l.id) } : l));
    const byId = new Map(listings.map((l) => [l.id, l]));

    const viewings: ViewingRequest[] = viewingRows.map((v) => {
      const l = byId.get(v.listing_id);
      return {
        id: v.id,
        listingId: v.listing_id,
        buyerId: v.buyer_id,
        listingTitle: l?.headline ?? 'Home listing',
        listingAddress: l ? this.addressLine(l) : 'Home listing',
        buyerName: v.buyer_name,
        buyerEmail: v.buyer_email,
        buyerPhone: v.buyer_phone,
        preferredDate: v.preferred_date,
        preferredTimeSlot: v.preferred_time_slot,
        notes: v.notes ?? undefined,
        status: v.status,
        createdAt: v.created_at,
      };
    });

    const threads: ConversationThread[] = convoRows.map((c) => {
      const l = byId.get(c.listing_id);
      const buyer = people.get(c.buyer_id);
      const seller = people.get(c.seller_id);
      const msgs: Row[] = (c.messages ?? []).slice().sort((a: Row, b: Row) => a.created_at.localeCompare(b.created_at));
      // In an admin thread the admin is the "buyer" side and always shows as Charles - Admin
      const isAdminThread = !!c.is_admin_thread;
      return {
        isAdminThread,
        id: c.id,
        buyerId: c.buyer_id,
        listingId: c.listing_id,
        listingTitle: l?.headline ?? 'Home listing',
        listingCoverUrl: l?.photos[0]?.thumbnailUrl ?? l?.photos[0]?.url ?? '',
        buyerName: isAdminThread ? ADMIN_DISPLAY_NAME : buyer?.full_name ?? 'Buyer',
        buyerEmail: buyer?.email ?? '',
        sellerId: c.seller_id,
        sellerName: seller?.full_name ?? 'Homeowner',
        messages: msgs.map((m) => {
          const isBuyer = m.sender_id === c.buyer_id;
          const sender = people.get(m.sender_id);
          return {
            id: m.id,
            senderId: m.sender_id,
            senderName: isAdminThread && isBuyer ? ADMIN_DISPLAY_NAME : sender?.full_name ?? (isBuyer ? 'Buyer' : 'Homeowner'),
            senderRole: isBuyer ? 'buyer' : 'seller',
            content: m.content,
            timestamp: m.created_at,
          };
        }),
        updatedAt: c.last_message_at,
        unreadCount: msgs.filter((m) => m.sender_id !== me.id && !m.read_at).length,
      };
    });

    const reports: ListingReport[] = reportRows.map((r) => ({
      id: r.id,
      listingId: r.listing_id,
      listingTitle: byId.get(r.listing_id)?.headline ?? 'Listing',
      reporterEmail: r.reporter_email,
      reason: r.reason,
      details: r.details,
      createdAt: r.created_at,
      status: r.status,
    }));

    this.listings = listings;
    this.viewings = viewings;
    this.threads = threads;
    this.reports = reports;
    this.savedIds = favRows.map((f) => f.listing_id);
    this.notifications = notificationRows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body ?? '',
      listingId: n.listing_id ?? undefined,
      conversationId: n.conversation_id ?? undefined,
      viewingId: n.viewing_id ?? undefined,
      createdAt: n.created_at,
      read: !!n.read_at,
    }));
    this.notifSignature = notificationRows.map((n) => `${n.id}:${n.created_at}:${n.read_at ? 1 : 0}`).join('|');
    // Announce notifications that arrived since the last load (not the ones that were already there at sign-in)
    for (const n of this.notifications) {
      const key = `${n.id}:${n.createdAt}`;
      if (n.read || this.announced.has(key)) continue;
      this.announced.add(key);
      if (this.notificationsPrimed) this.incomingListeners.forEach((l) => l(n));
    }
    this.notificationsPrimed = true;
    this.loaded = true;
    this.loadError = null;
    this.notify();
  }

  /**
   * Loads every listing this person needs, without the old 500-listing cap:
   *  - all public listings (live), page by page;
   *  - all of the person's own listings, whatever their status (drafts, in review, sold...);
   *  - for admins, every listing waiting for review.
   * Merged by id, newest first.
   */
  private async loadListings(me: UserProfile, signedIn: boolean): Promise<Row[]> {
    const select = `${LISTING_COLUMNS}, listing_photos(*)`;
    const PAGE = 500;
    const MAX_PUBLIC = 10_000; // a safety stop; past this, browsing needs server-side search

    const loadPublic = async (): Promise<Row[]> => {
      const rows: Row[] = [];
      for (let from = 0; from < MAX_PUBLIC; from += PAGE) {
        const { data, error } = await supabase
          .from('listings')
          .select(select)
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data as Row[]) ?? []));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    };
    const loadWhere = async (column: string, value: string): Promise<Row[]> => {
      const { data, error } = await supabase.from('listings').select(select).eq(column, value).limit(1000);
      if (error) throw error;
      return (data as Row[]) ?? [];
    };

    // Admins manage every listing, whatever its status
    const loadAllForAdmin = async (): Promise<Row[]> => {
      const rows: Row[] = [];
      for (let from = 0; from < MAX_PUBLIC; from += PAGE) {
        const { data, error } = await supabase
          .from('listings')
          .select(select)
          .neq('status', 'live')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data as Row[]) ?? []));
        if (!data || data.length < PAGE) break;
      }
      return rows;
    };

    const [publicRows, ownRows, queueRows] = await Promise.all([
      loadPublic(),
      signedIn ? loadWhere('user_id', me.id) : Promise.resolve([] as Row[]),
      signedIn && me.role === 'admin' ? loadAllForAdmin() : Promise.resolve([] as Row[]),
    ]);

    const byId = new Map<string, Row>();
    for (const row of [...publicRows, ...ownRows, ...queueRows]) byId.set(row.id, row);
    return [...byId.values()].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  private addressLine(l: Listing): string {
    return l.streetAddress
      ? `${l.streetAddress}${l.unitNumber ? ` #${l.unitNumber}` : ''}, ${l.city}`
      : `${l.neighborhood}, ${l.city}`;
  }

  private mapListing(row: Row, priv?: Row, seller?: Row): Listing {
    const photos: PhotoItem[] = ((row.listing_photos ?? []) as Row[])
      .slice()
      .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnail_url,
        caption: p.caption ?? undefined,
        isCover: !!p.is_cover,
        width: p.width ?? undefined,
        height: p.height ?? undefined,
        fileSize: p.file_size ?? undefined,
      }));


    return {
      id: row.id,
      userId: row.user_id,
      sellerName: seller?.full_name ?? 'Homeowner',
      sellerEmail: seller?.email ?? '',
      sellerPhone: seller?.phone ?? '',
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      streetAddress: priv?.street_address ?? undefined,
      unitNumber: priv?.unit_number ?? undefined,
      postalCode: priv?.postal_code ?? undefined,
      postalFsa: row.postal_fsa ?? undefined,
      city: row.city,
      province: row.province ?? 'BC',
      neighborhood: row.neighborhood,
      // The map shows the real spot only when the owner chose to show the address
      lat: row.show_address && priv?.exact_lat != null ? Number(priv.exact_lat) : Number(row.lat),
      lng: row.show_address && priv?.exact_lng != null ? Number(priv.exact_lng) : Number(row.lng),
      propertyType: row.property_type,
      price: Number(row.price),
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      sqft: Number(row.sqft),
      lotSqft: num(row.lot_sqft),
      lotAcres: num(row.lot_acres),
      yearBuilt: Number(row.year_built),
      parkingSpaces: Number(row.parking_spaces),
      strataFee: num(row.strata_fee),
      propertyTaxesAnnual: num(row.property_taxes_annual),
      offersCashback: !!row.offers_cashback,
      cashbackType: row.cashback_type,
      cashbackAmount: Number(row.cashback_amount),
      agentsWelcome: !!row.agents_welcome,
      showAddress: !!row.show_address,
      agentCommissionType: row.agent_commission_type ?? undefined,
      agentCommissionValue: num(row.agent_commission_value),
      estimatedCommissionSaved: Number(row.estimated_commission_saved),
      photos,
      headline: row.headline,
      description: row.description,
      neighborhoodHighlights: row.neighborhood_highlights ?? undefined,
      recentUpgrades: Array.isArray(row.recent_upgrades) ? row.recent_upgrades : [],
      inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
      reviewNotes: row.review_notes ?? undefined,
      adminHold: !!row.admin_hold,
      viewsCount: Number(row.views_count),
      savesCount: Number(row.saves_count),
      inquiriesCount: Number(row.inquiries_count),
      subscriptionTier: row.subscription_tier,
      billingCycle: row.billing_cycle,
      monthlyFeeCAD: num(row.monthly_fee_cad),
      paymentStatus: row.payment_status,
      pastDueSince: row.past_due_since ?? undefined,
      cancelAtPeriodEnd: !!row.cancel_at_period_end,
      nextBillingAt: row.next_billing_at ?? undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // Favourites
  // ---------------------------------------------------------------------------
  async toggleFavorite(listingId: string): Promise<void> {
    const me = this.requireUser();
    const wasSaved = this.savedIds.includes(listingId);
    // Optimistic update so the heart responds instantly
    this.savedIds = wasSaved ? this.savedIds.filter((id) => id !== listingId) : [...this.savedIds, listingId];
    this.notify();

    const { error } = wasSaved
      ? await supabase.from('favourites').delete().eq('user_id', me.id).eq('listing_id', listingId)
      : await supabase.from('favourites').insert({ user_id: me.id, listing_id: listingId });

    if (error && error.code !== '23505') {
      this.savedIds = wasSaved ? [...this.savedIds, listingId] : this.savedIds.filter((id) => id !== listingId);
      this.notify();
      fail(error);
    }
  }

  // ---------------------------------------------------------------------------
  // Listings (seller)
  // ---------------------------------------------------------------------------
  async saveListing(input: ListingSubmission): Promise<string> {
    const me = this.requireUser();

    const id = input.id ?? newId();
    const existing = input.id ? this.getListingById(id) : undefined;
    const isEdit = !!existing;
    const ownerId = existing?.userId ?? me.id;

    const fsa = input.postalCode.replace(/\s+/g, '').toUpperCase().slice(0, 3);
    const payload = {
      city: input.city,
      province: input.province,
      neighborhood: input.neighborhood,
      postal_fsa: fsa,
      lat: input.lat,
      lng: input.lng,
      property_type: input.propertyType,
      price: input.price,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      sqft: input.sqft,
      lot_sqft: input.lotSqft ?? null,
      lot_acres: input.lotAcres ?? null,
      year_built: input.yearBuilt,
      parking_spaces: input.parkingSpaces,
      strata_fee: input.strataFee ?? 0,
      property_taxes_annual: input.propertyTaxesAnnual ?? null,
      offers_cashback: input.offersCashback,
      cashback_type: input.cashbackType,
      cashback_amount: input.cashbackAmount,
      estimated_commission_saved: input.estimatedCommissionSaved,
      ...agentOfferColumns(input),
      show_address: !!input.showAddress,
      headline: input.headline,
      description: input.description,
      neighborhood_highlights: input.neighborhoodHighlights ?? null,
      recent_upgrades: input.recentUpgrades,
      inclusions: input.inclusions,
    };

    // An approved listing keeps showing its current version while changes to its words, address
    // or photos wait for review. Price and home details still go live straight away.
    if (existing && ['live', 'paused'].includes(existing.status) && !existing.adminHold) {
      await this.saveApprovedListingEdit(existing, ownerId, input, payload);
      await this.recordTerms();
      await this.refresh();
      return id;
    }

    // Changes left waiting from when the listing was live no longer apply (taken down, on hold...)
    if (existing?.pendingEdit) await this.discardPendingEdit(id, { refresh: false });

    // 1. The listing itself
    if (!isEdit) {
      const { error } = await supabase.from('listings').insert({ id, user_id: me.id, ...payload });
      if (error) fail(error, 'We could not save your listing.');
    } else {
      const { data, error } = await supabase.from('listings').update(payload).eq('id', id).select('id');
      if (error) fail(error, 'We could not update your listing.');
      if (!data?.length) throw new Error('You do not have permission to edit this listing.');
    }

    // 2. Exact address (private table)
    {
      const { error } = await supabase.from('listing_private_details').upsert(
        {
          listing_id: id,
          street_address: input.streetAddress,
          unit_number: input.unitNumber ?? null,
          postal_code: input.postalCode,
          exact_lat: input.lat,
          exact_lng: input.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' }
      );
      if (error) fail(error, 'We could not save the address.');
    }

    // 3. Photos
    await this.syncPhotos(id, ownerId, existing?.photos ?? [], input.photos);

    // 5. Submit for review (drafts and rejected listings go back to the review queue)
    const status: ListingStatus = existing?.status ?? 'draft';
    if (status === 'rejected') {
      const { error } = await supabase.from('listings').update({ status: 'draft' }).eq('id', id);
      if (error) fail(error);
    }
    if (status === 'draft' || status === 'rejected') {
      const { error } = await supabase.from('listings').update({ status: 'in_review' }).eq('id', id);
      if (error) fail(error);
    }

    await this.recordTerms();
    await this.refresh();
    return id;
  }

  /**
   * Saves an edit to an approved (live or paused) listing without taking it down:
   *  - price and home details go straight onto the listing;
   *  - changes to the words, address or photos are stored in listing_pending_edits for review;
   *  - saving the live version again (no reviewed changes) drops any changes waiting for review.
   */
  private async saveApprovedListingEdit(existing: Listing, ownerId: string, input: ListingSubmission, payload: Row) {
    const id = existing.id;
    const {
      headline, description, neighborhood, neighborhood_highlights, recent_upgrades, inclusions,
      city, province, postal_fsa, lat, lng, ...details
    } = payload;

    const { data, error } = await supabase.from('listings').update(details).eq('id', id).select('id');
    if (error) fail(error, 'We could not update your listing.');
    if (!data?.length) throw new Error('You do not have permission to edit this listing.');

    if (!editNeedsReview(input, existing)) {
      // Same words, address and photos as the live listing: nothing to review
      if (existing.pendingEdit) await this.discardPendingEdit(id, { refresh: false });
      await this.syncPhotos(id, ownerId, existing.photos, input.photos); // order and cover only
      return;
    }

    const photos = await this.uploadNewPhotos(id, ownerId, input.photos);
    const { error: saveError } = await supabase.from('listing_pending_edits').upsert(
      {
        listing_id: id,
        user_id: existing.userId,
        headline, description, neighborhood, neighborhood_highlights, recent_upgrades, inclusions,
        city, province, postal_fsa, lat, lng,
        street_address: input.streetAddress,
        unit_number: input.unitNumber ?? null,
        postal_code: input.postalCode,
        photos: photos.map((p) => ({
          id: p.id,
          url: p.url,
          thumbnail_url: p.thumbnailUrl,
          caption: p.caption ? stripHtml(p.caption).slice(0, 120) : null,
          is_cover: p.isCover,
          width: p.width ? Math.round(p.width) : null,
          height: p.height ? Math.round(p.height) : null,
          file_size: p.fileSize ? Math.round(p.fileSize) : null,
        })),
      },
      { onConflict: 'listing_id' }
    );
    if (saveError) fail(saveError, 'We could not save your changes.');

    // Photos added in an earlier version of these changes and since removed
    const stale = pendingOnlyFiles(existing.pendingEdit, existing.photos, photos);
    if (stale.length) await supabase.storage.from(PHOTO_BUCKET).remove(stale);
  }

  /** Uploads photos that are still on the device (data: URLs) and returns the list with their web addresses. */
  private async uploadNewPhotos(listingId: string, ownerId: string, wanted: PhotoItem[]): Promise<PhotoItem[]> {
    const hasCover = wanted.some((p) => p.isCover);
    const out: PhotoItem[] = [];
    for (let i = 0; i < wanted.length; i++) {
      const p = { ...wanted[i], isCover: hasCover ? wanted[i].isCover : i === 0 };
      if (!p.url.startsWith('data:')) {
        out.push(p);
        continue;
      }
      const safeId = p.id.replace(/[^A-Za-z0-9_-]/g, '') || newId();
      const base = `${ownerId}/${listingId}/${safeId}`;
      const [full, thumb] = await Promise.all([fetch(p.url).then((r) => r.blob()), fetch(p.thumbnailUrl).then((r) => r.blob())]);
      const [u1, u2] = await Promise.all([
        supabase.storage.from(PHOTO_BUCKET).upload(`${base}.jpg`, full, { contentType: 'image/jpeg', upsert: true }),
        supabase.storage.from(PHOTO_BUCKET).upload(`${base}_thumb.jpg`, thumb, { contentType: 'image/jpeg', upsert: true }),
      ]);
      if (u1.error) fail(u1.error, 'A photo could not be uploaded.');
      if (u2.error) fail(u2.error, 'A photo could not be uploaded.');
      out.push({
        ...p,
        id: safeId,
        url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl,
        thumbnailUrl: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${base}_thumb.jpg`).data.publicUrl,
      });
    }
    return out;
  }

  /** Owner: drop the changes waiting for review. The live listing is not affected. */
  async discardPendingEdit(listingId: string, opts: { refresh?: boolean } = {}): Promise<void> {
    this.requireUser();
    const l = this.getListingById(listingId);
    const files = pendingOnlyFiles(l?.pendingEdit, l?.photos ?? []);
    const { error } = await supabase.from('listing_pending_edits').delete().eq('listing_id', listingId);
    if (error) fail(error, 'We could not discard your changes.');
    if (files.length) await supabase.storage.from(PHOTO_BUCKET).remove(files);
    if (opts.refresh !== false) await this.refresh();
  }

  /** Deletes photo files that approved changes took off a listing (only the owner may delete them). */
  private cleaningPhotos = false;
  private async cleanUpPhotoFiles(): Promise<void> {
    if (this.cleaningPhotos) return;
    this.cleaningPhotos = true;
    try {
      const { data, error } = await supabase.from('listing_photo_cleanup').select('id, url').limit(100);
      if (error || !data?.length) return;
      const paths = data.map((r) => pathFromPublicUrl(r.url)).filter((p): p is string => !!p);
      if (paths.length) {
        const { error: removeError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
        if (removeError) return;
      }
      await supabase.from('listing_photo_cleanup').delete().in('id', data.map((r) => r.id));
    } catch {
      // Try again next time
    } finally {
      this.cleaningPhotos = false;
    }
  }

  /** True when saving these changes will send an approved listing's changes for review (see reviewRules). */
  editNeedsReview(input: ListingSubmission): boolean {
    return editNeedsReview(input, input.id ? this.getListingById(input.id) : undefined);
  }

  private async syncPhotos(listingId: string, ownerId: string, current: PhotoItem[], wanted: PhotoItem[]) {
    const keep = wanted.filter((p) => !p.url.startsWith('data:'));
    const keepIds = new Set(keep.map((p) => p.id));
    const removed = current.filter((p) => !keepIds.has(p.id));

    if (removed.length) {
      const { error } = await supabase.from('listing_photos').delete().in('id', removed.map((p) => p.id));
      if (error) fail(error);
      const paths = removed
        .flatMap((p) => [pathFromPublicUrl(p.url), pathFromPublicUrl(p.thumbnailUrl)])
        .filter((p): p is string => !!p);
      if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    }

    // Make sure there is exactly one cover photo
    const hasCover = wanted.some((p) => p.isCover);
    const withCover = wanted.map((p, i) => ({ ...p, isCover: hasCover ? p.isCover : i === 0 }));

    const newRows: Row[] = [];
    for (let i = 0; i < withCover.length; i++) {
      const p = withCover[i];
      if (!p.url.startsWith('data:')) {
        const { error } = await supabase
          .from('listing_photos')
          .update({ sort_order: i, is_cover: p.isCover, caption: p.caption ?? null })
          .eq('id', p.id);
        if (error) fail(error);
        continue;
      }
      const safeId = p.id.replace(/[^A-Za-z0-9_-]/g, '') || newId();
      const base = `${ownerId}/${listingId}/${safeId}`;
      const [full, thumb] = await Promise.all([
        fetch(p.url).then((r) => r.blob()),
        fetch(p.thumbnailUrl).then((r) => r.blob()),
      ]);
      const [u1, u2] = await Promise.all([
        supabase.storage.from(PHOTO_BUCKET).upload(`${base}.jpg`, full, { contentType: 'image/jpeg', upsert: true }),
        supabase.storage.from(PHOTO_BUCKET).upload(`${base}_thumb.jpg`, thumb, { contentType: 'image/jpeg', upsert: true }),
      ]);
      if (u1.error) fail(u1.error, 'A photo could not be uploaded.');
      if (u2.error) fail(u2.error, 'A photo could not be uploaded.');
      newRows.push({
        listing_id: listingId,
        url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${base}.jpg`).data.publicUrl,
        thumbnail_url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${base}_thumb.jpg`).data.publicUrl,
        caption: p.caption ? stripHtml(p.caption).slice(0, 120) : null,
        is_cover: p.isCover,
        sort_order: i,
        width: p.width ?? null,
        height: p.height ?? null,
        file_size: p.fileSize ?? null,
      });
    }
    if (newRows.length) {
      const { error } = await supabase.from('listing_photos').insert(newRows);
      if (error) fail(error, 'Photos were uploaded but could not be saved.');
    }
  }

  async updateListingStatus(id: string, status: ListingStatus): Promise<void> {
    this.requireUser();
    const { data, error } = await supabase.from('listings').update({ status }).eq('id', id).select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('You do not have permission to change this listing.');
    await this.refresh();
  }

  /** Sends the owner to Stripe Checkout to activate a listing ($24.99 CAD / month). */
  async startCheckout(listingId: string): Promise<void> {
    this.requireUser();
    trackEvent('activate_listing');
    const { data, error } = await supabase.functions.invoke('create-checkout', { body: { listingId } });
    if (error || !data?.url) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      throw new Error(msg || 'We could not start checkout. Please try again.');
    }
    window.location.assign(data.url);
  }

  /**
   * Wakes the checkout server and opens a connection to Stripe while the person is still reading,
   * so "Activate listing" opens checkout faster. Safe to call more than once; never throws.
   */
  warmCheckout(): void {
    if (typeof document !== 'undefined' && !document.querySelector('link[data-om-preconnect]')) {
      for (const href of ['https://checkout.stripe.com', 'https://js.stripe.com']) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        link.crossOrigin = 'anonymous';
        link.setAttribute('data-om-preconnect', '');
        document.head.appendChild(link);
      }
    }
    void supabase.functions.invoke('create-checkout', { body: { warm: true } }).catch(() => {});
  }

  /** Opens Stripe's billing portal (update card, invoices, cancel). */
  async openBillingPortal(): Promise<void> {
    this.requireUser();
    const { data, error } = await supabase.functions.invoke('create-portal', { body: {} });
    if (error || !data?.url) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      throw new Error(msg || 'We could not open billing. Please try again.');
    }
    window.location.assign(data.url);
  }

  /**
   * Runs a server-side action (edge function) and turns its error into a readable message.
   * Used for anything that must end a Stripe subscription before changing data.
   */
  private async callFunction(name: string, body: Record<string, unknown>, fallback: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error || !data?.ok) {
      let msg = data?.error as string | undefined;
      try { msg = msg ?? (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      throw new Error(msg || fallback);
    }
  }

  /** Deletes a listing and its photos. Any subscription for it stops now (no refund). */
  async deleteListing(id: string): Promise<void> {
    this.requireUser();
    await this.callFunction('listing-action', { listingId: id, action: 'delete' }, 'We could not delete this listing. Please try again.');
    await this.refresh();
  }

  /** Admin: delete any listing for good, telling the owner why. Billing stops now (no refund). */
  async adminDeleteListing(id: string, reason: string): Promise<void> {
    this.requireUser();
    await this.callFunction(
      'listing-action',
      { listingId: id, action: 'delete', reason: stripHtml(reason).slice(0, 500) },
      'We could not delete this listing. Please try again.'
    );
    await this.refresh();
  }

  /** Marks a listing sold. Its subscription ends at the close of the paid month (no refund). */
  async markListingSold(id: string): Promise<void> {
    this.requireUser();
    await this.callFunction('listing-action', { listingId: id, action: 'sold' }, 'We could not mark this listing sold. Please try again.');
    await this.refresh();
  }

  /**
   * Admin take-down: the listing is hidden and sent back to the owner with the reason; they must
   * edit and resubmit for review. Its subscription ends at the close of the paid month (no refund).
   */
  async takeDownListing(id: string, reason: string): Promise<void> {
    this.requireUser();
    await this.callFunction(
      'listing-action',
      { listingId: id, action: 'takedown', reason: stripHtml(reason).slice(0, 500) },
      'We could not take this listing down. Please try again.'
    );
    await this.refresh();
  }

  // ---------------------------------------------------------------------------
  // Admin: listing review + reports
  // ---------------------------------------------------------------------------
  /** Approve a listing after a quick content review. The owner can then activate (pay) to publish it. */
  async approveListing(listingId: string): Promise<void> {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'live', review_notes: null, admin_hold: false })
      .eq('id', listingId)
      .eq('status', 'in_review')
      .select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('This listing is no longer waiting for review.');
    await this.refresh();
  }

  /** Approve an owner's changes to a live listing: they replace the live version. */
  async approveListingEdit(listingId: string): Promise<void> {
    const { error } = await supabase.rpc('admin_approve_listing_edit', { _listing_id: listingId });
    if (error) fail(error, 'We could not approve these changes.');
    await this.refresh();
  }

  /** Send an owner's changes back with a reason. The live version stays up unchanged. */
  async rejectListingEdit(listingId: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('admin_reject_listing_edit', { _listing_id: listingId, _reason: stripHtml(reason).slice(0, 500) });
    if (error) fail(error, 'We could not send these changes back.');
    await this.refresh();
  }

  /** Send a listing back to the owner with a reason (shown to them in their dashboard). */
  async rejectListing(listingId: string, reason: string): Promise<void> {
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'rejected', review_notes: stripHtml(reason).slice(0, 500) })
      .eq('id', listingId)
      .eq('status', 'in_review')
      .select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('This listing is no longer waiting for review.');
    await this.refresh();
  }

  /** Admin: pause any listing with a reason the owner sees. Only an admin can put it back up. */
  async adminPauseListing(listingId: string, reason: string): Promise<void> {
    this.requireUser();
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'paused', admin_hold: true, review_notes: stripHtml(reason).slice(0, 500) })
      .eq('id', listingId)
      .in('status', ['live', 'paused'])
      .select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('Only listings that are up or paused can be paused.');
    await this.refresh();
  }

  /**
   * Admin: show an approved listing to buyers without payment ("Free · not paid"), or end that.
   * Only for listings with no Stripe subscription running, so Stripe can't overwrite it.
   */
  async adminSetFreeListing(listingId: string, free: boolean): Promise<void> {
    this.requireUser();
    // payment_status is a private column: signed-in users may write it (admins only, enforced by a
    // database trigger) but not filter on it, so the current state is checked from the admin's copy.
    await this.refresh();
    const current = this.getListingById(listingId)?.paymentStatus ?? 'unpaid';
    if (free && !['unpaid', 'canceled'].includes(current)) {
      throw new Error('This listing already has billing set up, so it can’t be made free.');
    }
    if (!free && current !== 'complimentary_launch') throw new Error('This listing isn’t a free listing any more.');
    const { data, error } = await supabase
      .from('listings')
      .update(free ? { payment_status: 'complimentary_launch', past_due_since: null } : { payment_status: 'unpaid' })
      .eq('id', listingId)
      .select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('Could not update this listing. Refresh the page and try again.');
    await this.refresh();
  }

  /** Admin: lift a pause and put the listing back up (it shows to buyers if its billing is in order). */
  async adminResumeListing(listingId: string): Promise<void> {
    this.requireUser();
    const { data, error } = await supabase
      .from('listings')
      .update({ status: 'live', admin_hold: false, review_notes: null })
      .eq('id', listingId)
      .eq('status', 'paused')
      .select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('This listing is no longer paused.');
    await this.refresh();
  }

  /** Admin: message the owner of any listing, as "Charles - Admin". */
  async adminMessageSeller(listingId: string, content: string): Promise<string> {
    this.requireUser();
    const { data, error } = await supabase.rpc('admin_start_conversation', { _listing_id: listingId });
    if (error) fail(error, 'We could not start the conversation. Has the admin database update been run?');
    const conversationId = data as string;
    await this.replyToThread(conversationId, content);
    return conversationId;
  }

  /** Admin: everyone with an account. */
  async adminLoadUsers(): Promise<AdminUserRow[]> {
    const rows: AdminUserRow[] = [];
    for (let from = 0; from < 20_000; from += 1000) {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role, created_at, email_marketing_opt_in')
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      if (error) fail(error);
      rows.push(
        ...((data as Row[]) ?? []).map((u) => ({
          id: u.id,
          fullName: u.full_name ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          role: u.role,
          createdAt: u.created_at,
          marketingOptIn: !!u.email_marketing_opt_in,
        }))
      );
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  async resolveReport(reportId: string, action: 'dismissed' | 'resolved'): Promise<void> {
    const { data, error } = await supabase.from('reports').update({ status: action }).eq('id', reportId).select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('Only administrators can resolve reports.');
    await this.refresh();
  }

  // ---------------------------------------------------------------------------
  // Viewings, messages, reports (buyers)
  // ---------------------------------------------------------------------------
  async addViewingRequest(input: {
    listingId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    preferredDate: string;
    preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
    notes?: string;
  }): Promise<void> {
    const me = this.requireUser();
    const { error } = await supabase.from('viewing_requests').insert({
      listing_id: input.listingId,
      buyer_id: me.id,
      buyer_name: input.buyerName,
      buyer_email: input.buyerEmail,
      buyer_phone: input.buyerPhone,
      preferred_date: input.preferredDate,
      preferred_time_slot: input.preferredTimeSlot,
      notes: input.notes || null,
    });
    if (error) fail(error);
    await this.refresh();
  }

  async updateViewingStatus(id: string, status: ViewingRequest['status']): Promise<void> {
    const { data, error } = await supabase.from('viewing_requests').update({ status }).eq('id', id).select('id');
    if (error) fail(error);
    if (!data?.length) throw new Error('You do not have permission to change this request.');
    await this.refresh();
  }

  /** A buyer writes to the owner of a listing (starts the conversation if needed). */
  async sendMessageToSeller(listing: Listing, content: string): Promise<void> {
    const me = this.requireUser();
    let conversationId = this.threads.find((t) => t.listingId === listing.id && t.buyerId === me.id)?.id;

    if (!conversationId) {
      const created = await supabase
        .from('conversations')
        .insert({ listing_id: listing.id, buyer_id: me.id, seller_id: listing.userId })
        .select('id')
        .single();
      if (created.error) {
        if (created.error.code === '23505') {
          const found = await supabase
            .from('conversations')
            .select('id')
            .eq('listing_id', listing.id)
            .eq('buyer_id', me.id)
            .single();
          if (found.error) fail(found.error);
          conversationId = found.data!.id;
        } else {
          fail(created.error);
        }
      } else {
        conversationId = created.data.id;
      }
    }

    await this.replyToThread(conversationId!, content);
  }

  async replyToThread(conversationId: string, content: string): Promise<void> {
    const me = this.requireUser();
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: me.id, content: stripHtmlKeepLines(content).slice(0, 5000) });
    if (error) fail(error);
    await this.refresh();
  }

  async markThreadRead(conversationId: string): Promise<void> {
    const thread = this.threads.find((t) => t.id === conversationId);
    if (!thread || thread.unreadCount === 0) return;
    await supabase.rpc('mark_conversation_read', { _conversation_id: conversationId });
    thread.unreadCount = 0;
    this.notifications.forEach((n) => {
      if (n.conversationId === conversationId) n.read = true;
    });
    this.notify();
  }

  async markNotificationRead(id: string): Promise<void> {
    const n = this.notifications.find((x) => x.id === id);
    if (!n || n.read) return;
    n.read = true;
    this.notify();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async markAllNotificationsRead(): Promise<void> {
    if (!this.notifications.some((n) => !n.read)) return;
    this.notifications.forEach((n) => (n.read = true));
    this.notify();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  }

  /** Marks notifications of the given kinds as read (e.g. when the person opens the Viewings tab). */
  async markNotificationsReadByType(types: string[]): Promise<void> {
    const pending = this.notifications.filter((n) => !n.read && types.includes(n.type));
    if (!pending.length) return;
    pending.forEach((n) => (n.read = true));
    this.notify();
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('type', types)
      .is('read_at', null);
  }

  async submitReport(input: {
    listingId: string;
    reason: ListingReport['reason'];
    details: string;
  }): Promise<void> {
    const me = this.requireUser();
    const { error } = await supabase.from('reports').insert({
      listing_id: input.listingId,
      reporter_id: me.id,
      reporter_email: me.email,
      reason: input.reason,
      details: input.details,
    });
    if (error) fail(error);
  }

  incrementViews(listingId: string) {
    try {
      const key = `dh_viewed_${listingId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable: count anyway */
    }
    // A Supabase call only runs once something waits on it, so a bare `void` here would never send
    // the request. Errors are ignored on purpose: counting a view must never get in a visitor's way.
    supabase.rpc('increment_listing_views', { _listing_id: listingId }).then(
      () => {},
      () => {}
    );
  }

  // ---------------------------------------------------------------------------
  // Email preferences (CASL): saved on the profile with the date they changed
  // ---------------------------------------------------------------------------
  private static readonly LEGACY_PREFS_KEY = 'directhome_casl_prefs_v1';

  async getEmailPreferences(): Promise<{ marketing: boolean; digest: boolean; notify: boolean }> {
    const me = this.requireUser();
    const { data, error } = await supabase
      .from('users')
      .select('email_marketing_opt_in, email_digest_opt_in, email_notify')
      .eq('id', me.id)
      .maybeSingle();
    if (!error && data) {
      return { marketing: !!data.email_marketing_opt_in, digest: !!data.email_digest_opt_in, notify: data.email_notify !== false };
    }
    if (error && (error.code === '42703' || error.code === 'PGRST204')) {
      // Before migration 014 there is no email_notify column yet
      const old = await supabase.from('users').select('email_marketing_opt_in, email_digest_opt_in').eq('id', me.id).maybeSingle();
      if (!old.error && old.data) return { marketing: !!old.data.email_marketing_opt_in, digest: !!old.data.email_digest_opt_in, notify: true };
    }
    // Before migration 012 the columns don't exist yet: fall back to what this device saved
    try {
      const raw = JSON.parse(localStorage.getItem(DataStore.LEGACY_PREFS_KEY) ?? '{}');
      return { marketing: !!raw.marketing, digest: !!raw.digest, notify: true };
    } catch {
      return { marketing: false, digest: false, notify: true };
    }
  }

  /** Returns 'account' when saved to the profile, 'device' when only this browser could keep it. */
  async saveEmailPreferences(prefs: { marketing: boolean; digest: boolean; notify?: boolean }): Promise<'account' | 'device'> {
    const me = this.requireUser();
    const update: Record<string, boolean> = { email_marketing_opt_in: prefs.marketing, email_digest_opt_in: prefs.digest };
    if (prefs.notify !== undefined) update.email_notify = prefs.notify;
    let { error } = await supabase.from('users').update(update).eq('id', me.id);
    if (error && prefs.notify !== undefined && (error.code === '42703' || error.code === 'PGRST204')) {
      // Before migration 014: save the rest
      ({ error } = await supabase
        .from('users')
        .update({ email_marketing_opt_in: prefs.marketing, email_digest_opt_in: prefs.digest })
        .eq('id', me.id));
    }
    if (!error) {
      try { localStorage.removeItem(DataStore.LEGACY_PREFS_KEY); } catch { /* ignore */ }
      return 'account';
    }
    if (error.code !== '42703' && error.code !== 'PGRST204') fail(error, 'Your preferences could not be saved.');
    try {
      localStorage.setItem(DataStore.LEGACY_PREFS_KEY, JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
    return 'device';
  }

  // ---------------------------------------------------------------------------
  // Terms, privacy tools
  // ---------------------------------------------------------------------------
  async recordTerms(): Promise<void> {
    const me = this.requireUser();
    await supabase
      .from('users')
      .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
      .eq('id', me.id);
  }

  /** Everything we hold about the signed-in person, for a PIPEDA data-access request. */
  async exportUserData(): Promise<Record<string, unknown>> {
    const me = this.requireUser();
    await this.refresh();
    const [profile, checklists] = await Promise.all([
      supabase.from('users').select('*').eq('id', me.id).single(),
      supabase.from('seller_checklists').select('listing_id, done, updated_at'),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      // Includes your email preferences (marketing / digest) and when you last changed them
      profile: profile.data ?? null,
      listings: this.listings.filter((l) => l.userId === me.id),
      sellerChecklists: checklists.data ?? [],
      viewingRequests: this.viewings,
      conversations: this.threads,
      notifications: this.notifications,
      savedListingIds: this.savedIds,
      note: 'Reports you filed about listings are kept by our review team; email privacy@ownersmarket.ca to request a copy.',
    };
  }

  /** Permanently deletes the account, its listings, files, messages and favourites. */
  async deleteAccount(): Promise<void> {
    this.requireUser();
    // Done on the server: cancels any Stripe subscriptions first, then photos, then the account
    await this.callFunction('delete-account', {}, 'Your account could not be deleted. Please contact support.');
    this.clearAllDrafts();
  }

  // ---------------------------------------------------------------------------
  // Wizard draft (kept on this device only, one per signed-in user)
  // ---------------------------------------------------------------------------
  private draftKey(userId: string = this.user.id): string {
    return `directhome_wizard_draft_v2:${userId}`;
  }

  /** The key under which this person's unfinished-listing photos are kept on the device. */
  draftPhotosKey(): string {
    return this.draftKey();
  }

  /** Where photos are kept while signed out (moved to the account on sign-in). */
  guestDraftPhotosKey(): string {
    return this.draftKey(GUEST_USER.id);
  }

  /** Moves a draft started while signed out to the account that just signed in (unless it has one). */
  private adoptGuestDraft(userId: string) {
    const from = this.draftKey(GUEST_USER.id);
    const to = this.draftKey(userId);
    try {
      const guestDraft = localStorage.getItem(from);
      if (guestDraft) {
        if (!localStorage.getItem(to)) localStorage.setItem(to, guestDraft);
        localStorage.removeItem(from);
      }
    } catch {
      /* storage blocked: nothing to move */
    }
    void moveDraftPhotos(from, to);
  }

  getDraft(): Record<string, any> | null {
    try {
      const raw = localStorage.getItem(this.draftKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveDraft(draft: Record<string, any>) {
    try {
      localStorage.setItem(this.draftKey(), JSON.stringify(draft));
      this.notify();
    } catch {
      /* device storage full or blocked: drafts are best-effort */
    }
  }

  clearDraft() {
    try {
      localStorage.removeItem(this.draftKey());
      this.notify();
    } catch {
      /* ignore */
    }
    void deleteDraftPhotos(this.draftKey());
  }

  clearAllDrafts() {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('directhome_wizard_draft_v2:'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    try {
      indexedDB.deleteDatabase('ownersmarket-drafts'); // draft photos kept on this device
    } catch {
      /* ignore */
    }
  }
}

export const db = new DataStore();
