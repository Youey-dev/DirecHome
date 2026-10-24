import { friendMessage, shareLinks, shareUrl } from '../src/lib/sharePosts';

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
  console.log('✅ Share links: listing link with UTM tags, no address or phone\n');
}
