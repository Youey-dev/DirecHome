import { EXAMPLE_LISTINGS, examplesToShow, findExample } from '../src/data/exampleListings';
import { pathFor } from '../src/lib/routes';

export function runExampleTests() {
  console.log('🧪 Testing example listings...');
  const fail = (m: string) => { throw new Error(m); };
  if (EXAMPLE_LISTINGS.length !== 6) fail('There should be 6 example listings');
  for (const l of EXAMPLE_LISTINGS) {
    if (!l.isExample) fail(`${l.id} is not flagged as an example`);
    if (!l.id.startsWith('example-')) fail(`${l.id} needs the example- prefix`);
    if (!l.photos.length || !l.photoCredits?.length) fail(`${l.id} needs photos and credits`);
    if (l.province === 'QC') fail('No Québec examples');
  }
  const counts: [number, number][] = [[0, 6], [4, 2], [6, 0], [20, 0]];
  for (const [real, want] of counts) {
    if (examplesToShow(real).length !== want) fail(`With ${real} real homes expected ${want} examples`);
  }
  const l = EXAMPLE_LISTINGS[0];
  if (pathFor('example', l.id) !== `/example/${l.id.replace('example-', '')}`) fail('Wrong example address');
  if (findExample(l.id) !== l || findExample('example-nope')) fail('findExample lookup is wrong');
  console.log('✅ Example listings: flagged, credited, and hidden once 6 real homes are live\n');
}
