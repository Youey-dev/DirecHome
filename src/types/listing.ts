/**
 * Core type definitions for OwnersMarket marketplace
 */

export type PropertyType = 
  | 'Single Family Detached'
  | 'Townhouse'
  | 'Condo / Apartment'
  | 'Duplex / Half-Duplex'
  | 'Acreage / Farm';

export type ListingStatus = 
  | 'draft'
  | 'in_review'
  | 'live'
  | 'paused'
  | 'sold'
  | 'rejected';

export interface PhotoItem {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  isCover: boolean;
  width?: number;
  height?: number;
  fileSize?: number;
}

export interface ViewingRequest {
  id: string;
  listingId: string;
  /** The person who asked to view the home. */
  buyerId: string;
  listingTitle: string;
  listingAddress: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  preferredDate: string;
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening';
  notes?: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'declined' | 'completed';
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'buyer' | 'seller';
  content: string;
  timestamp: string;
}

export interface ConversationThread {
  id: string;
  buyerId: string;
  listingId: string;
  listingTitle: string;
  listingCoverUrl: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  messages: Message[];
  updatedAt: string;
  unreadCount: number;
}

export interface ListingReport {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterEmail: string;
  reason: 'incorrect_info' | 'not_homeowner' | 'inappropriate_photos' | 'scam_suspected' | 'already_sold' | 'other';
  details: string;
  createdAt: string;
  status: 'pending' | 'dismissed' | 'resolved';
}

export interface Listing {
  id: string;
  userId: string;
  sellerName: string;
  sellerEmail: string;
  sellerPhone: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;

  // Address
  // Exact address fields are ONLY present for the owner, admins, and buyers whose
  // viewing request was confirmed (enforced by database security rules).
  streetAddress?: string;
  unitNumber?: string;
  postalCode?: string;
  city: string;
  /** Two-letter province or territory code, e.g. 'BC', 'ON', 'QC'. */
  province: string;
  /** First three characters of the postal code (e.g. "V2Y") — safe to show publicly. */
  postalFsa?: string;
  neighborhood: string;
  /** Approximate map position (rounded to ~1 km) for public viewers. */
  lat: number;
  lng: number;

  // Key Specs
  propertyType: PropertyType;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft?: number;
  lotAcres?: number;
  yearBuilt: number;
  parkingSpaces: number;
  strataFee?: number; // monthly for condo/townhouse
  propertyTaxesAnnual?: number;

  // Cash-Back & Commission
  offersCashback: boolean;
  cashbackType: 'fixed' | 'percentage';
  cashbackAmount: number; // e.g. $15,000 or 1.5%
  estimatedCommissionSaved: number;

  // Media
  photos: PhotoItem[];

  // Descriptions & Highlights
  headline: string;
  description: string;
  neighborhoodHighlights?: string;
  recentUpgrades?: string[];
  inclusions?: string[];

  // Verification
  /** Reason given by the review team when a listing is sent back (status 'rejected'). */
  reviewNotes?: string;

  // Analytics
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;

  // Billing & Subscription Architecture (Future-Ready: Free for MVP Launch)
  subscriptionTier?: 'free_launch' | 'standard_monthly' | 'featured_monthly';
  billingCycle?: 'free_launch' | 'monthly' | 'annual';
  monthlyFeeCAD?: number; // Always $0 during MVP
  paymentStatus?: 'unpaid' | 'complimentary_launch' | 'active' | 'past_due' | 'canceled';
  pastDueSince?: string;
  cancelAtPeriodEnd?: boolean;
  nextBillingAt?: string;
  // Terms & Privacy Acceptance (Audit Log)
  termsAcceptedAt?: string;
  termsVersion?: string; // e.g. "2026-v1.0-draft"

  /**
   * Example listing (src/data/exampleListings.ts): shows how a home looks on OwnersMarket.
   * Not a real home and not for sale; never stored in the database.
   */
  isExample?: boolean;
  /** Photo credits for example listings, e.g. "Jason Briscoe / Unsplash". */
  photoCredits?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin' | 'guest';
  isGuest?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
}

// ==============================================================================
// Relational Data Model (9 entities matching PostgreSQL & Supabase RLS)
// ==============================================================================

export type User = UserProfile;

export interface ListingPhoto extends PhotoItem {
  listingId?: string;
  sortOrder?: number;
}

export interface Verification {
  id: string;
  listingId: string;
  documentType: 'property_tax_notice' | 'land_title_search' | 'bc_assessment' | 'other';
  fileName: string;
  fileSize: string;
  filePath: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  auditedBy?: string;
  auditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Favourite {
  id: string;
  userId: string;
  listingId: string;
  createdAt: string;
}

export interface Report {
  id: string;
  listingId: string;
  reporterId?: string;
  reporterEmail: string;
  reason: 'incorrect_info' | 'not_homeowner' | 'inappropriate_photos' | 'scam_suspected' | 'already_sold' | 'other';
  details: string;
  status: 'pending' | 'dismissed' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

/** A notification created automatically by the database (new message, viewing update, listing review...). */
export interface AppNotification {
  id: string;
  type:
    | 'new_message'
    | 'viewing_requested'
    | 'viewing_confirmed'
    | 'viewing_declined'
    | 'viewing_cancelled'
    | 'viewing_rescheduled'
    | 'listing_live'
    | 'listing_rejected'
    | 'listing_in_review'
    | 'listing_rereview'
    | 'new_report'
    | string;
  title: string;
  body: string;
  listingId?: string;
  conversationId?: string;
  viewingId?: string;
  createdAt: string;
  read: boolean;
}

/** True when buyers can see this listing: approved AND paid (a failed payment gets a 1-day grace period). */
export const isListingLive = (l: Pick<Listing, 'status' | 'paymentStatus' | 'pastDueSince'>): boolean => {
  if (l.status !== 'live') return false;
  const p = l.paymentStatus ?? 'unpaid';
  if (p === 'active' || p === 'complimentary_launch') return true;
  if (p === 'past_due' && l.pastDueSince) return Date.now() - new Date(l.pastDueSince).getTime() < 24 * 60 * 60 * 1000;
  return false;
};
