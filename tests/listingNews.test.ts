import { isoToLocal, localToIso, openHouseIcs, priceDrop, isAlertableDrop, shortDay, timeRange, upcomingOpenHouses } from '../src/lib/listingNews';

export function runListingNewsTests() {
const fail = (m: string) => { throw new Error(m); };
const eq = (a: unknown, b: unknown, m: string) => { if (a !== b) fail(`${m}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); };

// Local time in the home's province <-> exact moment
eq(localToIso('2026-11-15', '14:00', 'BC'), '2026-11-15T22:00:00.000Z', 'BC 2 pm in November is 22:00 UTC (PST)');
eq(localToIso('2026-07-15', '14:00', 'BC'), '2026-07-15T21:00:00.000Z', 'BC 2 pm in July is 21:00 UTC (PDT)');
eq(localToIso('2026-11-15', '14:00', 'ON'), '2026-11-15T19:00:00.000Z', 'Ontario 2 pm in November');
eq(localToIso('2026-11-15', '14:00', 'NL'), '2026-11-15T17:30:00.000Z', 'Newfoundland half-hour zone');
eq(localToIso('2026-07-15', '14:00', 'SK'), '2026-07-15T20:00:00.000Z', 'Saskatchewan has no daylight time');
const back = isoToLocal('2026-11-15T22:00:00.000Z', 'BC');
eq(back.date + ' ' + back.time, '2026-11-15 14:00', 'Back to the form');

// Labels
const oh = { id: 'x', listingId: 'l', startsAt: '2026-11-15T22:00:00.000Z', endsAt: '2026-11-16T00:00:00.000Z', goingCount: 0 };
eq(timeRange(oh, 'BC'), '2–4 pm', 'Same half of the day');
eq(timeRange({ startsAt: '2026-11-15T19:00:00.000Z', endsAt: '2026-11-15T21:30:00.000Z' }, 'BC'), '11 am – 1:30 pm', 'Across noon');
eq(shortDay(oh.startsAt, 'BC'), 'Sun Nov 15', 'Short day');

// Upcoming only
const now = Date.parse('2026-11-15T23:00:00.000Z');
eq(upcomingOpenHouses({ openHouses: [oh, { ...oh, id: 'c', cancelledAt: '2026-11-01' }, { ...oh, id: 'old', endsAt: '2026-11-15T22:30:00.000Z' }] }, now).length, 1, 'Cancelled and finished ones are hidden');

// Price drops
const at = '2026-11-10T00:00:00.000Z';
eq(priceDrop({ price: 1134000, priceReducedFrom: 1149000, priceReducedAt: at }, Date.parse('2026-11-12'))?.amount, 15000, 'Shows the drop');
eq(priceDrop({ price: 1134000, priceReducedFrom: 1149000, priceReducedAt: at }, Date.parse('2026-11-30')), null, 'Gone after 14 days');
eq(priceDrop({ price: 1200000, priceReducedFrom: 1149000, priceReducedAt: at }, Date.parse('2026-11-12')), null, 'No drop if the price went back up');
eq(isAlertableDrop(1000000, 995000), false, 'Under 1% is not a drop');
eq(isAlertableDrop(1000000, 985000), true, 'Over 1% is a drop');

// Calendar file
const ics = openHouseIcs(oh, { id: 'l', headline: 'Rancher, with yard; fenced', city: 'Abbotsford', province: 'BC' });
if (!ics.includes('DTSTART:20261115T220000Z') || !ics.includes('SUMMARY:Open house: Rancher\\, with yard\; fenced')) fail('Calendar file');

console.log('✓ Open house times, labels, price drops and calendar files');
}
