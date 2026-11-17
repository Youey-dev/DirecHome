import { communityPost, friendMessage, postShareLinks, shareLinks, shareUrl } from '../src/lib/sharePosts';

export function runShareTests() {
  console.log('🧪 Testing share-your-listing links...');
  const fail = (m: string) => { throw new Error(m); };
  const l: any = {
    id: '11111111-1111-1111-1111-111111111111',
    headline: 'Bright rancher with a big yard',
    city: 'Grand Forks',
    streetAddress: '123 Secret Street',
    sellerPhone: '604-555-0199',
  };
  const all = [friendMessage(l), ...Object.values(shareLinks(l))].map((s) => decodeURIComponent(s)).join('\n');
  if (all.includes('Secret Street') || all.includes('555-0199')) fail('Share links must never include the street address or phone number');
  if (!shareUrl(l.id, 'facebook').includes('utm_source=facebook&utm_medium=share')) fail('Share links need UTM tags');
  if (!decodeURIComponent(shareLinks(l).facebook).includes(`/listing/${l.id}`)) fail('Facebook share must link to the listing');
  if (!friendMessage(l).includes('Grand Forks')) fail('The message should name the city');
  // The ready-made community post
  const p = { ...l, city: 'argyle shore', province: 'PE', price: 739000, bedrooms: 5, bathrooms: 3, headline: 'Family home with screened porch' };
  const post = communityPost(p);
  for (const want of ['For sale by owner in Argyle Shore, PEI', '$739,000 · 5 bedrooms · 3 bathrooms', 'Family home with screened porch', `/listing/${l.id}?utm_source=community&utm_medium=share`]) {
    if (!post.includes(want)) fail(`Community post should include "${want}", got:\n${post}`);
  }
  if (!communityPost({ ...p, bedrooms: 1, bathrooms: 1.5 }).includes('1 bedroom · 1.5 bathrooms')) fail('Singular and half bathrooms');
  const everything = [post, ...Object.values(postShareLinks(p))].map((s) => decodeURIComponent(s)).join('\n');
  if (everything.includes('Secret Street') || everything.includes('555-0199')) fail('Community post must never include the address or phone number');
  if (!decodeURIComponent(postShareLinks(p).whatsapp).includes('utm_source=whatsapp')) fail('WhatsApp post should be tagged as WhatsApp');
  console.log('✅ Share links: listing link with UTM tags, no address or phone; community post reads well\n');
}
