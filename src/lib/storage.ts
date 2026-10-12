import { Listing, ViewingRequest, ConversationThread, ListingReport, UserProfile, VerificationDocument } from '../types/listing';
import { INITIAL_LISTINGS } from '../data/mockListings';

const STORAGE_KEYS = {
  LISTINGS: 'directhome_listings_v1',
  SAVED_IDS: 'directhome_saved_ids_v1',
  VIEWING_REQUESTS: 'directhome_viewings_v1',
  THREADS: 'directhome_threads_v1',
  REPORTS: 'directhome_reports_v1',
  ACTIVE_USER: 'directhome_active_user_v1',
  WIZARD_DRAFT: 'directhome_wizard_draft_v1',
  RATE_LIMIT_TIMESTAMPS: 'directhome_msg_rate_limits_v1'
};

// Initial guest user representation (unauthenticated visitor)
export const GUEST_USER: UserProfile = {
  id: 'guest',
  email: '',
  name: 'Guest Visitor',
  role: 'guest',
  isGuest: true
};

// Initial default user: Buyer Alex
export const DEFAULT_USER: UserProfile = {
  id: 'user-buyer-alex',
  email: 'alex.buyer@gmail.com',
  name: 'Alex Rivera',
  phone: '604-555-8291',
  role: 'buyer'
};

export const PRESET_USERS: Record<string, UserProfile> = {
  buyer: DEFAULT_USER,
  seller: {
    id: 'user-seller-sarah',
    email: 'sarah.miller@directhome.ca',
    name: 'Sarah & David Miller',
    phone: '604-555-0142',
    role: 'seller'
  },
  admin: {
    id: 'user-admin-clover',
    email: 'compliance@directhome.ca',
    name: 'BC Verification Team',
    role: 'admin'
  }
};

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (typeof window === 'undefined') return;

    const storedListings = localStorage.getItem(STORAGE_KEYS.LISTINGS);
    if (!storedListings) {
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(INITIAL_LISTINGS));
    } else {
      try {
        const parsed = JSON.parse(storedListings);
        if (Array.isArray(parsed) && parsed.length < INITIAL_LISTINGS.length) {
          localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(INITIAL_LISTINGS));
        }
      } catch {
        localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(INITIAL_LISTINGS));
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.SAVED_IDS)) {
      localStorage.setItem(STORAGE_KEYS.SAVED_IDS, JSON.stringify(['dh-langley-20876']));
    }

    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(DEFAULT_USER));
    }

    if (!localStorage.getItem(STORAGE_KEYS.VIEWING_REQUESTS)) {
      const initialViewing: ViewingRequest = {
        id: 'viewing-101',
        listingId: 'dh-langley-20876',
        listingAddress: '20876 77A Avenue, Langley',
        buyerName: 'Alex Rivera',
        buyerEmail: 'alex.buyer@gmail.com',
        buyerPhone: '604-555-8291',
        preferredDate: '2026-10-14',
        preferredTimeSlot: 'afternoon',
        notes: 'Pre-approved with TD Bank. Looking forward to seeing the backyard and heat pump setup.',
        status: 'confirmed',
        createdAt: '2026-10-08T15:00:00Z'
      };
      localStorage.setItem(STORAGE_KEYS.VIEWING_REQUESTS, JSON.stringify([initialViewing]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.THREADS)) {
      const initialThread: ConversationThread = {
        id: 'thread-langley-alex',
        listingId: 'dh-langley-20876',
        listingTitle: 'Custom Pacific Northwest Craftsman in Willoughby Heights',
        listingCoverUrl: INITIAL_LISTINGS[0].photos[0].url,
        buyerName: 'Alex Rivera',
        buyerEmail: 'alex.buyer@gmail.com',
        sellerId: 'user-seller-sarah',
        updatedAt: '2026-10-08T15:45:00Z',
        unreadCount: 0,
        messages: [
          {
            id: 'm1',
            senderId: 'user-buyer-alex',
            senderName: 'Alex Rivera',
            senderRole: 'buyer',
            content: 'Hi Sarah, does the detached workshop shed have electrical run to it, and are you flexible on closing date around November?',
            timestamp: '2026-10-08T15:30:00Z'
          },
          {
            id: 'm2',
            senderId: 'user-seller-sarah',
            senderName: 'Sarah Miller',
            senderRole: 'seller',
            content: 'Hi Alex! Yes, the cedar garden shed has an underground conduit with standard 15A power. And late November or early December works great for us. Looking forward to meeting you on Tuesday!',
            timestamp: '2026-10-08T15:45:00Z'
          }
        ]
      };
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify([initialThread]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify([]));
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Listings with RLS Policy Enforcement ---
  public getListings(user?: UserProfile): Listing[] {
    const active = user || this.getActiveUser();
    let all: Listing[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LISTINGS);
      all = raw ? JSON.parse(raw) : INITIAL_LISTINGS;
    } catch {
      all = INITIAL_LISTINGS;
    }

    // RLS Policy Enforcements:
    // 1. Admins see all listings.
    // 2. Sellers see all live listings + their own listings regardless of status.
    // 3. Buyers see ONLY live listings.
    if (active.role === 'admin') {
      return all;
    }
    if (active.role === 'seller') {
      return all.filter((l) => l.status === 'live' || l.userId === active.id);
    }
    return all.filter((l) => l.status === 'live');
  }

  public getAllListingsRaw(): Listing[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LISTINGS);
      return raw ? JSON.parse(raw) : INITIAL_LISTINGS;
    } catch {
      return INITIAL_LISTINGS;
    }
  }

  public getListingById(id: string, user?: UserProfile): Listing | undefined {
    const active = user || this.getActiveUser();
    const listing = this.getAllListingsRaw().find((item) => item.id === id);
    if (!listing) return undefined;

    // RLS Access Rule: Buyers see only live listings; owners and admins see all
    if (listing.status === 'live' || active.role === 'admin' || listing.userId === active.id) {
      return listing;
    }
    return undefined;
  }

  public saveListing(listing: Listing, user?: UserProfile) {
    const active = user || this.getActiveUser();
    const listings = this.getAllListingsRaw();
    const existingIndex = listings.findIndex((l) => l.id === listing.id);

    if (existingIndex >= 0) {
      const existing = listings[existingIndex];
      // RLS Access Rule: Sellers edit ONLY their own listings
      if (active.role !== 'admin' && existing.userId !== active.id) {
        throw new Error('RLS Access Denied: Sellers can only edit their own listings.');
      }
      listings[existingIndex] = { ...listing, updatedAt: new Date().toISOString() };
    } else {
      listings.unshift({ 
        ...listing, 
        userId: active.id,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
    }

    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    this.notify();
  }

  public deleteListing(id: string, user?: UserProfile) {
    const active = user || this.getActiveUser();
    const listings = this.getAllListingsRaw();
    const target = listings.find((l) => l.id === id);
    if (!target) return;

    // RLS Access Rule: Sellers delete ONLY their own listings
    if (active.role !== 'admin' && target.userId !== active.id) {
      throw new Error('RLS Access Denied: Sellers can only delete their own listings.');
    }

    const filtered = listings.filter((l) => l.id !== id);
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(filtered));
    this.notify();
  }

  public updateListingStatus(id: string, status: Listing['status'], notes?: string, user?: UserProfile) {
    const active = user || this.getActiveUser();
    const listings = this.getAllListingsRaw();
    const target = listings.find((l) => l.id === id);
    if (target) {
      // RLS Rule: Non-admins cannot alter someone else's listing
      if (active.role !== 'admin' && target.userId !== active.id) {
        throw new Error('RLS Access Denied: Sellers can only modify their own listings.');
      }

      if (status === 'live' && target.verificationDoc) {
        target.verificationDoc.status = 'verified';
      } else if (status === 'rejected' && target.verificationDoc) {
        target.verificationDoc.status = 'rejected';
      }
      target.status = status;
      if (notes) target.verificationNotes = notes;
      target.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
      this.notify();
    }
  }

  // --- Verifications RLS Access ---
  // Verification documents are visible ONLY to the owner and admins. Never to buyers.
  public getVerificationDoc(listingId: string, user?: UserProfile): VerificationDocument | null {
    const active = user || this.getActiveUser();
    const listing = this.getAllListingsRaw().find((l) => l.id === listingId);
    if (!listing || !listing.verificationDoc) return null;

    if (active.role === 'admin' || listing.userId === active.id) {
      return listing.verificationDoc;
    }
    return null;
  }

  // --- Favorites / Saved ---
  public getSavedIds(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_IDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public toggleFavorite(listingId: string): boolean {
    let saved = this.getSavedIds();
    const exists = saved.includes(listingId);
    if (exists) {
      saved = saved.filter((id) => id !== listingId);
    } else {
      saved.push(listingId);
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_IDS, JSON.stringify(saved));

    // Also update listing saveCount
    const listings = this.getListings();
    const listing = listings.find((l) => l.id === listingId);
    if (listing) {
      listing.savesCount = Math.max(0, listing.savesCount + (exists ? -1 : 1));
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    }

    this.notify();
    return !exists;
  }

  public isFavorited(listingId: string): boolean {
    return this.getSavedIds().includes(listingId);
  }

  // --- Active User ---
  public getActiveUser(): UserProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
      return raw ? JSON.parse(raw) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  }

  public setActiveUser(user: UserProfile) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    this.notify();
  }

  public isGuest(user?: UserProfile): boolean {
    const target = user || this.getActiveUser();
    return Boolean(target.isGuest || target.role === 'guest' || !target.email);
  }

  public logout(): void {
    this.setActiveUser(GUEST_USER);
  }

  // --- Wizard Autosave Draft ---
  public getDraft(): Partial<Listing> | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WIZARD_DRAFT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public saveDraft(draft: Partial<Listing>) {
    localStorage.setItem(STORAGE_KEYS.WIZARD_DRAFT, JSON.stringify({
      ...draft,
      savedAt: new Date().toISOString()
    }));
    this.notify();
  }

  public clearDraft() {
    localStorage.removeItem(STORAGE_KEYS.WIZARD_DRAFT);
    this.notify();
  }

  // --- Viewing Requests with RLS Scoping ---
  public getViewingRequests(user?: UserProfile): ViewingRequest[] {
    const active = user || this.getActiveUser();
    let all: ViewingRequest[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VIEWING_REQUESTS);
      all = raw ? JSON.parse(raw) : [];
    } catch {
      all = [];
    }

    // RLS Access Rules:
    // 1. Admins see all viewing requests.
    // 2. Sellers see viewing requests for properties they own.
    // 3. Buyers see only their own viewing requests.
    if (active.role === 'admin') {
      return all;
    }
    if (active.role === 'seller') {
      const myListingIds = this.getAllListingsRaw()
        .filter((l) => l.userId === active.id)
        .map((l) => l.id);
      return all.filter((v) => myListingIds.includes(v.listingId));
    }
    return all.filter((v) => v.buyerEmail === active.email || v.buyerName === active.name);
  }

  public addViewingRequest(request: Omit<ViewingRequest, 'id' | 'createdAt' | 'status'>): ViewingRequest {
    const viewings = this.getViewingRequests();
    const newViewing: ViewingRequest = {
      ...request,
      id: 'viewing-' + Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    viewings.unshift(newViewing);
    localStorage.setItem(STORAGE_KEYS.VIEWING_REQUESTS, JSON.stringify(viewings));

    // increment inquiries
    const listings = this.getListings();
    const listing = listings.find((l) => l.id === request.listingId);
    if (listing) {
      listing.inquiriesCount += 1;
      localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(listings));
    }

    this.notify();
    return newViewing;
  }

  public updateViewingStatus(id: string, status: ViewingRequest['status']) {
    const viewings = this.getViewingRequests();
    const item = viewings.find((v) => v.id === id);
    if (item) {
      item.status = status;
      localStorage.setItem(STORAGE_KEYS.VIEWING_REQUESTS, JSON.stringify(viewings));
      this.notify();
    }
  }

  // --- Messaging & Anti-Spam Rate Limiting (RLS Scoped) ---
  public getThreads(user?: UserProfile): ConversationThread[] {
    const active = user || this.getActiveUser();
    let all: ConversationThread[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.THREADS);
      all = raw ? JSON.parse(raw) : [];
    } catch {
      all = [];
    }

    // RLS: Only participants (buyer or seller) or admin can view conversation threads
    if (active.role === 'admin') {
      return all;
    }
    return all.filter((t) => t.buyerEmail === active.email || t.sellerId === active.id);
  }

  public checkRateLimit(): { allowed: boolean; remaining: number; resetMinutes: number } {
    const MAX_CONVERSATIONS_PER_HOUR = 5;
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_TIMESTAMPS);
      let timestamps: number[] = raw ? JSON.parse(raw) : [];
      // Clean timestamps older than 1 hour
      timestamps = timestamps.filter((t) => now - t < ONE_HOUR);
      localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_TIMESTAMPS, JSON.stringify(timestamps));

      if (timestamps.length >= MAX_CONVERSATIONS_PER_HOUR) {
        const oldest = timestamps[0];
        const resetMinutes = Math.max(1, Math.ceil((ONE_HOUR - (now - oldest)) / 60000));
        return { allowed: false, remaining: 0, resetMinutes };
      }

      return {
        allowed: true,
        remaining: MAX_CONVERSATIONS_PER_HOUR - timestamps.length,
        resetMinutes: 60
      };
    } catch {
      return { allowed: true, remaining: MAX_CONVERSATIONS_PER_HOUR, resetMinutes: 60 };
    }
  }

  public recordConversationStart() {
    const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_TIMESTAMPS);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    timestamps.push(Date.now());
    localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_TIMESTAMPS, JSON.stringify(timestamps));
  }

  public sendMessage(
    listingId: string,
    listingTitle: string,
    listingCoverUrl: string,
    sellerId: string,
    buyerName: string,
    buyerEmail: string,
    content: string,
    senderRole: 'buyer' | 'seller'
  ): ConversationThread {
    const threads = this.getThreads();
    let thread = threads.find((t) => t.listingId === listingId && t.buyerEmail === buyerEmail);

    if (!thread) {
      this.recordConversationStart();
      thread = {
        id: 'thread-' + Date.now().toString(),
        listingId,
        listingTitle,
        listingCoverUrl,
        sellerId,
        buyerName,
        buyerEmail,
        messages: [],
        updatedAt: new Date().toISOString(),
        unreadCount: 0
      };
      threads.unshift(thread);
    }

    const newMessage = {
      id: 'm-' + Date.now().toString(),
      senderId: senderRole === 'buyer' ? buyerEmail : sellerId,
      senderName: senderRole === 'buyer' ? buyerName : 'Seller',
      senderRole,
      content,
      timestamp: new Date().toISOString()
    };

    thread.messages.push(newMessage);
    thread.updatedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
    this.notify();
    return thread;
  }

  // --- Reports (RLS Restricted: Only Admins can view reports) ---
  public getReports(user?: UserProfile): ListingReport[] {
    const active = user || this.getActiveUser();
    if (active.role !== 'admin') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public submitReport(report: Omit<ListingReport, 'id' | 'createdAt' | 'status'>): ListingReport {
    const reports = this.getReports();
    const newReport: ListingReport = {
      ...report,
      id: 'rep-' + Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    reports.unshift(newReport);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    this.notify();
    return newReport;
  }

  public resolveReport(id: string, action: 'dismissed' | 'resolved') {
    const reports = this.getReports();
    const target = reports.find((r) => r.id === id);
    if (target) {
      target.status = action;
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
      this.notify();
    }
  }

  // --- PIPEDA & Legal Compliance Methods ---
  public acceptTerms(version: string = '2026-v1.0-draft') {
    const user = this.getActiveUser();
    const updated: UserProfile = {
      ...user,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: version
    };
    this.setActiveUser(updated);
    return updated;
  }

  public exportUserData(user?: UserProfile) {
    const active = user || this.getActiveUser();
    const listings = this.getListings(active).filter((l) => l.userId === active.id);
    const viewings = this.getViewingRequests(active);
    const threads = this.getThreads(active);
    const savedIds = this.getSavedIds();

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      compliance: 'PIPEDA / BC PIPA Individual Access Report',
      userProfile: active,
      userListings: listings,
      viewingAppointments: viewings,
      conversations: threads,
      savedHomes: savedIds
    };

    return exportPayload;
  }

  public resetToDemoData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LISTINGS, JSON.stringify(INITIAL_LISTINGS));
    localStorage.setItem(STORAGE_KEYS.SAVED_IDS, JSON.stringify(['dh-langley-20876', 'dh-coquitlam-3420']));
    this.notify();
  }
}

export const storage = new StorageService();
