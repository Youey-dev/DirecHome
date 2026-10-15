import { decideSync, endModeFor, paymentStatusFor, type SyncInput } from '../supabase/functions/_shared/billing-rules.ts';

export function runBillingTests() {
  console.log('🧪 Testing billing safety rules...');
  const check = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
    console.log(`  ✅ ${msg}`);
  };
  const base: SyncInput = {
    subscriptionId: 'sub_new',
    subscriptionStatus: 'active',
    listingExists: true,
    recordedSubscriptionId: null,
    recordedStatus: null,
  };
  const d = (over: Partial<SyncInput>) => decideSync({ ...base, ...over });

  check(JSON.stringify(d({})) === JSON.stringify({ kind: 'apply', claim: true }), 'First paid subscription claims the listing');
  check(d({ subscriptionStatus: 'incomplete' }).kind === 'apply' && !(d({ subscriptionStatus: 'incomplete' }) as any).claim, 'Unfinished first payment does not claim the listing');
  check(d({ recordedSubscriptionId: 'sub_new', subscriptionStatus: 'canceled' }).kind === 'apply', 'The recorded subscription ending updates the listing');

  check(d({ recordedSubscriptionId: 'sub_old', recordedStatus: 'active' }).kind === 'cancel_duplicate', 'A second paid subscription for one listing is cancelled');
  check(d({ recordedSubscriptionId: 'sub_old', recordedStatus: 'active', subscriptionStatus: 'canceled' }).kind === 'ignore', 'Cancelling a stray second subscription never hides the paid listing');
  check(d({ recordedSubscriptionId: 'sub_old', recordedStatus: 'canceled' }).kind === 'apply', 'A new subscription takes over after the old one ended');
  check(d({ recordedSubscriptionId: 'sub_old', recordedStatus: 'canceled', subscriptionStatus: 'incomplete' }).kind === 'ignore', 'An unfinished checkout does not take over');

  check(d({ listingExists: false }).kind === 'cancel_orphan', 'A subscription for a deleted listing is cancelled');
  check(d({ listingExists: false, subscriptionStatus: 'canceled' }).kind === 'ignore', 'An already-cancelled subscription for a deleted listing is left alone');

  check(endModeFor('delete', 'active') === 'now', 'Deleting a listing stops billing now');
  check(endModeFor('sold', 'active') === 'period_end', 'Marking sold ends billing at the close of the paid month');
  check(endModeFor('takedown', 'active') === 'period_end', 'A take-down ends billing at the close of the paid month (no refund)');
  check(endModeFor('takedown', 'past_due') === 'now', 'A take-down with a failing payment stops billing now');
  check(endModeFor('sold', 'canceled') === 'none', 'Nothing to end when billing already stopped');

  check(paymentStatusFor('trialing', 'unpaid') === 'active' && paymentStatusFor('incomplete', 'unpaid') === 'unpaid' && paymentStatusFor('unpaid', 'active') === 'canceled', 'Stripe statuses map to listing payment status');
  console.log('🎉 Billing safety tests passed.\n');
}
