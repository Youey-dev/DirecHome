/**
 * Seller checklist: the steps from the seller guide, ticked off per listing.
 *
 * Saved to the seller's account (table seller_checklists, migration 008). If that table
 * isn't set up yet, or the device is offline, ticks are kept on this device instead, so
 * the checklist always works.
 */
import { supabase } from './supabase';

export interface ChecklistStep {
  key: string;
  label: string;
  /** Where to learn more: a guide page (tab name) or an in-app action. */
  help?: { label: string; tab: string };
}

export const SELLER_STEPS: ChecklistStep[] = [
  { key: 'lawyer', label: 'Hire your lawyer or notary', help: { label: 'Why first', tab: 'guide-selling' } },
  { key: 'price', label: 'Research your price with your assessment and recent sales nearby', help: { label: 'How', tab: 'guide-selling' } },
  { key: 'documents', label: 'Gather your tax bill, mortgage details and records of work done' },
  { key: 'disclosure', label: 'Know what you must disclose about your home', help: { label: 'Guide', tab: 'guide-selling' } },
  { key: 'agent-decision', label: 'Decide what you’ll do if a buyer brings an agent (you can mark your listing “Agents welcome”)' },
  { key: 'sign', label: 'Put up your for-sale sign' },
  { key: 'feature-sheet', label: 'Print feature sheets to hand out at viewings' },
  { key: 'share', label: 'Share your listing with friends and local groups' },
  { key: 'viewings', label: 'Plan safe viewings: another adult home, valuables put away' },
  { key: 'offers', label: 'Send every offer to your lawyer before you sign' },
];

const localKey = (listingId: string) => `om-checklist-${listingId}`;

function readLocal(listingId: string): string[] {
  try {
    const raw = localStorage.getItem(localKey(listingId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(listingId: string, done: string[]) {
  try {
    localStorage.setItem(localKey(listingId), JSON.stringify(done));
  } catch {
    /* storage unavailable: the checklist still works for this visit */
  }
}

export async function loadChecklist(listingId: string): Promise<string[]> {
  const local = readLocal(listingId);
  try {
    const { data, error } = await supabase.from('seller_checklists').select('done').eq('listing_id', listingId).maybeSingle();
    if (error) return local;
    const saved = (data?.done as string[] | undefined) ?? [];
    // Merge in anything ticked on this device before the account copy existed
    return Array.from(new Set([...saved, ...local]));
  } catch {
    return local;
  }
}

export async function saveChecklist(listingId: string, userId: string, done: string[]): Promise<void> {
  writeLocal(listingId, done);
  try {
    await supabase
      .from('seller_checklists')
      .upsert({ listing_id: listingId, user_id: userId, done, updated_at: new Date().toISOString() }, { onConflict: 'listing_id' });
  } catch {
    /* kept on this device; saved to the account next time */
  }
}
