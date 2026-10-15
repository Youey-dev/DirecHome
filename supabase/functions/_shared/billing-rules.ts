// Billing rules shared by the Stripe edge functions. No imports, so the website's test suite
// can check them too (tests/billing.test.ts).

/** Stripe subscription statuses that are still charging, or about to. */
export const RUNNING_STATUSES = ["active", "trialing", "past_due", "unpaid", "incomplete"];

/** Statuses where the person has paid (or is in the payment-retry window). */
export const PAYING_STATUSES = ["active", "trialing", "past_due"];

export const isRunning = (status: string | null | undefined) => !!status && RUNNING_STATUSES.includes(status);
export const isPaying = (status: string | null | undefined) => !!status && PAYING_STATUSES.includes(status);

/** The listing's payment_status for a Stripe subscription status. */
export function paymentStatusFor(subStatus: string, current: string): string {
  switch (subStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "incomplete":
      return current; // first payment not finished yet: leave as it was
    default:
      return "canceled"; // canceled, unpaid, incomplete_expired, paused
  }
}

export type SyncDecision =
  /** Update the listing from this subscription. `claim` = record it as the listing's subscription. */
  | { kind: "apply"; claim: boolean }
  /** The listing is gone but the subscription still charges: cancel it. */
  | { kind: "cancel_orphan" }
  /** The listing already has a running subscription: cancel this second one (and refund it). */
  | { kind: "cancel_duplicate" }
  /** Nothing to do (e.g. a late event from a subscription that was replaced). */
  | { kind: "ignore" };

export interface SyncInput {
  subscriptionId: string;
  subscriptionStatus: string;
  listingExists: boolean;
  /** The subscription currently recorded for the listing, if any. */
  recordedSubscriptionId: string | null;
  /** Stripe status of the recorded subscription, when it is a different one. */
  recordedStatus: string | null;
}

/**
 * Decides what a Stripe event means for a listing. Only ONE subscription may drive a listing,
 * so a second checkout (two tabs, double tap, back button) can never hide a listing that is
 * still being paid for, and a deleted listing never keeps charging.
 */
export function decideSync(i: SyncInput): SyncDecision {
  if (!i.listingExists) return isRunning(i.subscriptionStatus) ? { kind: "cancel_orphan" } : { kind: "ignore" };

  if (!i.recordedSubscriptionId || i.recordedSubscriptionId === i.subscriptionId) {
    return { kind: "apply", claim: isPaying(i.subscriptionStatus) };
  }

  // A different subscription is recorded for this listing
  if (isRunning(i.recordedStatus)) {
    // Two running subscriptions for one listing: the newer one goes
    return isRunning(i.subscriptionStatus) ? { kind: "cancel_duplicate" } : { kind: "ignore" };
  }
  // The recorded one has ended: a new paying subscription takes over (owner re-activated)
  return isPaying(i.subscriptionStatus) ? { kind: "apply", claim: true } : { kind: "ignore" };
}

/** How a listing action ends its subscription. */
export function endModeFor(action: "sold" | "takedown" | "delete", subStatus: string): "now" | "period_end" | "none" {
  if (!isRunning(subStatus)) return "none";
  if (action === "delete") return "now"; // the listing is gone: stop billing now, no refund
  // Sold or taken down: nothing is refunded and billing stops at the end of the paid month.
  // If nothing has been paid for the current period (payment failing), stop now.
  return isPaying(subStatus) && subStatus !== "past_due" ? "period_end" : "now";
}
