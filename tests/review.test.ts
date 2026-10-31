import { editNeedsReview, withPendingEdit, type ReviewableEdit } from '../src/lib/reviewRules';
import type { Listing } from '../src/types/listing';

export function runReviewTests() {
  console.log('🧪 Testing which edits go back to review...');
  const check = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(msg);
    console.log(`  ✅ ${msg}`);
  };
  const photos = [
    { id: 'a', url: 'https://x/a.jpg', thumbnailUrl: 'https://x/a_t.jpg', isCover: true },
    { id: 'b', url: 'https://x/b.jpg', thumbnailUrl: 'https://x/b_t.jpg', isCover: false, caption: 'Kitchen' },
  ];
  const current = {
    status: 'live', headline: 'Bright townhouse near the park', description: 'Lovely home with a yard and new floors.',
    neighborhood: 'Clearbrook', neighborhoodHighlights: 'Parks', recentUpgrades: ['Roof'], inclusions: ['Fridge'],
    city: 'Abbotsford', province: 'BC', streetAddress: '123 Test St', unitNumber: undefined, postalCode: 'V2S 1A1', photos,
  } as unknown as Listing;
  const same: ReviewableEdit = {
    headline: current.headline, description: current.description, neighborhood: current.neighborhood,
    neighborhoodHighlights: 'Parks', recentUpgrades: ['Roof'], inclusions: ['Fridge'], city: 'Abbotsford', province: 'BC',
    streetAddress: '123 Test St', postalCode: 'v2s1a1', photos: [...photos],
  };

  check(!editNeedsReview(same, current), 'Saving with only price or detail changes stays live');
  check(!editNeedsReview({ ...same, photos: [photos[1], { ...photos[0], isCover: false }] }, current), 'Reordering photos or changing the cover stays live');
  check(editNeedsReview({ ...same, headline: 'New headline here' }, current), 'A new headline goes back to review');
  check(editNeedsReview({ ...same, description: 'Different text entirely, call me.' }, current), 'A new description goes back to review');
  check(editNeedsReview({ ...same, streetAddress: '125 Test St' }, current), 'A new street address goes back to review');
  check(editNeedsReview({ ...same, photos: [...photos, { id: 'c', url: 'data:image/jpeg;base64,xx', thumbnailUrl: 'data:', isCover: false }] }, current), 'A new photo goes back to review');
  check(editNeedsReview({ ...same, photos: [photos[0]] }, current), 'Removing a photo goes back to review');
  check(!editNeedsReview({ ...same, headline: 'Anything' }, { ...current, status: 'draft' } as Listing), 'Drafts are not affected (they are reviewed when submitted)');

  // Changes waiting for review: the editor reopens them; the live listing is untouched
  const pendingEdit = {
    status: 'pending' as const, headline: 'Changed headline', description: 'New words for the listing here.', neighborhood: 'Clearbrook',
    recentUpgrades: ['Roof', 'Deck'], inclusions: ['Fridge'], city: 'Abbotsford', province: 'BC', lat: 49.05, lng: -122.3,
    streetAddress: '123 Test St', postalCode: 'V2S 1A1', photos: [photos[1]], updatedAt: '2026-10-31',
  };
  const withEdit = { ...current, pendingEdit } as Listing;
  const forEditor = withPendingEdit(withEdit);
  check(forEditor.headline === 'Changed headline' && forEditor.photos.length === 1, 'Reopening the editor continues the changes waiting for review');
  check(withEdit.headline === current.headline, 'The live listing keeps its own words while changes wait');
  check(!editNeedsReview(same, withEdit), 'Saving the live version again needs no review (and drops the waiting changes)');
  check(withPendingEdit({ ...withEdit, status: 'rejected' } as Listing).headline === current.headline, 'Waiting changes are ignored once a listing is taken down');
  console.log('🎉 Review rule tests passed.\n');
}
