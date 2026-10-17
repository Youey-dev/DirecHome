import { stripHtmlKeepLines } from '../src/lib/security';
import { parseBlocks } from '../src/components/FormattedText';

export function runTextTests() {
  console.log('🧪 Testing listing text formatting...');
  const fail = (m: string) => { throw new Error(m); };
  const kept = stripHtmlKeepLines('First para.\r\n\r\n\r\n\r\nSecond <b>para</b>\n- one\n- two   \n');
  if (kept !== 'First para.\n\nSecond para\n- one\n- two') fail(`Line breaks should survive saving, got ${JSON.stringify(kept)}`);
  if (stripHtmlKeepLines('a<script>x</script>b') !== 'axb') fail('Tags must still be removed');
  const blocks = parseBlocks('Intro line one\nline two\n\nMain floor:\n- Kitchen: 12 × 11\n* Living: 16 × 14\n\n**Big lot** and solar');
  const kinds = blocks.map((b) => b.kind).join(',');
  if (kinds !== 'p,h,ul,p') fail(`Unexpected blocks: ${kinds}`);
  if (blocks[2].kind === 'ul' && blocks[2].items.length !== 2) fail('Both bullet styles should make one list');
  if (blocks[0].kind === 'p' && blocks[0].lines.length !== 2) fail('A single line break stays inside the paragraph');
  console.log('✅ Listing text: paragraphs, lists and headings survive and display\n');
}
