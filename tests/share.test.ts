import { friendMessage, groupPost, marketplacePost, shareLinks, shareUrl } from '../src/lib/sharePosts';

export function runShareTests() {
  console.log('🧪 Testing share-your-listing posts...');
  const fail = (m: string) => { throw new Error(m); };
  const l: any = {
    id: '11111111-1111-1111-1111-111111111111',
    headline: 'Bright rancher with a big yard',
    price: 549000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1650,
    propertyType: 'Single Family Detached',
    city: 'Grand Forks',
    province: 'BC',
    neighborhood: 'Ruckle',
    streetAddress: '123 Secret Street',
    sellerPhone: '604-555-0199',
    photos: [{}, {}, {}],
    agentsWelcome: false,
  };
  const all = [groupPost(l), marketplacePost(l).title, marketplacePost(l).body, friendMessage(l), ...Object.values(shareLinks(l))].join('\n');
  if (all.includes('Secret Street') || all.includes('555-0199')) fail('Share posts must never include the street address or phone number');
  if (!groupPost(l).includes('$549,000') || !groupPost(l).includes('Ruckle, Grand Forks, BC')) fail('Group post needs the price and the area');
  if (!groupPost(l).includes('all 3 photos')) fail('Group post should mention the photos');
  if (!shareUrl(l.id, 'facebook').includes('utm_source=facebook&utm_medium=share')) fail('Share links need UTM tags');
  if (!groupPost({ ...l, agentsWelcome: true }).includes('agent are welcome')) fail('Agents-welcome listings should say so');
  if (/finder|verified/i.test(all)) fail('No "finder\'s fee" or "verified" wording');
  if (!decodeURIComponent(shareLinks(l).facebook).includes(`/listing/${l.id}`)) fail('Facebook share must link to the listing');
  console.log('✅ Share posts: no address or phone, price and area, UTM links\n');
}
