import { listingMatchesQuery, parseQuery, suggestPlaces } from '../src/lib/placeSearch';

export function runSearchTests() {
  console.log('🧪 Testing the search box...');
  const ok = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`Search: ${what}`);
  };
  const homes = [
    { city: 'Abbotsford', province: 'BC', neighborhood: 'Clearbrook', postalFsa: 'V2T', headline: 'Rancher with a yard' },
    { city: 'Kelowna', province: 'BC', neighborhood: 'Glenmore', postalFsa: 'V1V', headline: 'Lake view' },
    { city: 'Calgary', province: 'AB', neighborhood: 'Beltline', postalFsa: 'T2R', headline: 'Condo downtown' },
    { city: 'Fort Saskatchewan', province: 'AB', neighborhood: 'Westpark', postalFsa: 'T8L', headline: 'Cozy condo' },
    { city: 'Kars', province: 'ON', neighborhood: 'Rideau', postalFsa: 'K0A', headline: 'Waterfront' },
  ];

  // Province codes and names
  for (const [q, code] of [['BC', 'BC'], ['b.c.', 'BC'], ['Ont', 'ON'], ['ON', 'ON'], ['sask', 'SK'], ['PEI', 'PE'], ['Alberta', 'AB'], ['nwt', 'NT']] as const) {
    ok(parseQuery(q).province === code, `"${q}" is ${code}`);
  }
  ok(homes.filter((h) => listingMatchesQuery(h, 'BC')).length === 2, '"BC" finds BC homes only');
  ok(homes.filter((h) => listingMatchesQuery(h, 'AB')).length === 2, '"AB" finds Alberta homes (not "Abbotsford")');
  ok(homes.filter((h) => listingMatchesQuery(h, 'Saskatchewan')).length === 0, '"Saskatchewan" is the province, not Fort Saskatchewan');

  // "City, PROV" and "City PROV"
  const p = parseQuery('Abbotsford, BC');
  ok(p.province === 'BC' && p.text === 'abbotsford', '"Abbotsford, BC" splits');
  ok(listingMatchesQuery(homes[0], 'abbotsford bc'), 'city + code matches');
  ok(!listingMatchesQuery(homes[0], 'abbotsford ab'), 'wrong province does not match');

  // Typos, accents, partial words, postal codes
  ok(listingMatchesQuery(homes[0], 'abotsford'), 'one typo');
  ok(listingMatchesQuery(homes[1], 'kelow'), 'start of a name');
  ok(listingMatchesQuery(homes[0], 'V2T 1A1'), 'full postal code');
  ok(listingMatchesQuery(homes[0], 'v2t'), 'postal area');
  ok(!listingMatchesQuery(homes[1], 'v2t'), 'other postal area');

  // Suggestions
  const s1 = suggestPlaces('bc', homes);
  ok(s1[0]?.kind === 'province' && s1[0].province === 'BC' && s1[0].count === 2, '"bc" suggests British Columbia with 2 homes');
  const s2 = suggestPlaces('ca', homes);
  ok(s2[0]?.label === 'Calgary' && s2[0].count === 1, '"ca" suggests Calgary (has a home) first');
  const s3 = suggestPlaces('Kel', homes);
  ok(s3[0]?.label === 'Kelowna', '"Kel" suggests Kelowna');
  ok(suggestPlaces('glen', homes).some((s) => s.kind === 'neighbourhood' && s.label === 'Glenmore'), 'neighbourhoods are suggested');
  ok(suggestPlaces('toront', homes)[0]?.label === 'Toronto', 'known cities without homes are suggested');
  ok(suggestPlaces('on', homes)[0]?.label === 'Ontario', '"on" suggests Ontario first');
  console.log('✅ Search box OK');
}
