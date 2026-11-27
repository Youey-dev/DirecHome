import { findLink } from '../src/lib/linkGuard';
import { BLOCKED, ALLOWED } from './linkGuard.cases';

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(`Link check failed: ${message}`);
  console.log(`  ✅ ${message}`);
}

/** Links are blocked in messages (anti-scam). The database runs the same rule; see linkGuard.cases.ts. */
export function runLinkGuardTests() {
  console.log('🧪 Testing that links are blocked in messages...');
  for (const text of BLOCKED) check(findLink(text) !== null, `blocked: ${JSON.stringify(text)}`);
  for (const text of ALLOWED) check(findLink(text) === null, `allowed: ${JSON.stringify(text)}`);
  console.log('🎉 Link blocking tests passed.\n');
}
