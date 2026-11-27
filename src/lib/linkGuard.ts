/**
 * Links in messages: blocked, to protect people from scams.
 *
 * Scammers have been asking buyers and owners to "continue on Teams" and then sending a link
 * that installs malware. So messages (and offer / viewing notes) may not contain web links or
 * web addresses, including disguised ones like "example dot com" or "example[.]com".
 * Email addresses are still allowed.
 *
 * The database enforces the same rule (supabase/migrations/20261043_block_links_in_messages.sql),
 * so this check is only here to give a friendly message before sending.
 * KEEP THE TWO IN SYNC: tests/linkGuard.test.ts lists the examples both must agree on.
 */

/** Endings that make "word.ending" a web address (or a file someone wants you to download). */
export const LINK_ENDINGS = [
  'com', 'ca', 'net', 'org', 'info', 'biz', 'io', 'co', 'app', 'xyz', 'online', 'site', 'top',
  'shop', 'store', 'live', 'link', 'click', 'me', 'ly', 'gl', 'gg', 'cc', 'ws', 'tk', 'ml', 'ga',
  'cf', 'gq', 'ru', 'cn', 'us', 'uk', 'tv', 'ai', 'dev', 'page', 'zip', 'mov', 'pro', 'vip', 'win',
  'fun', 'icu', 'club', 'exe', 'apk', 'msi', 'dmg', 'bat', 'scr',
];

const ENDINGS = LINK_ENDINGS.join('|');

const PATTERNS: RegExp[] = [
  // http://, https://, hxxp://, ftp:// (also with spaces, or the colon left out)
  /\b(?:h[tx]{2}ps?|ftp)\s*:?\s*\/\s*\//i,
  // www. / www dot / www[.]
  /\bwww\s*(?:\.|[[({<]\s*(?:\.|dot)\s*[\]})>]|\bdot\b)/i,
  // example.com, teams.live, setup.exe
  new RegExp(`\\b[a-z0-9][a-z0-9-]*\\.(?:${ENDINGS})\\b`, 'i'),
  // example dot com, example[.]com, example (dot) com, example<dot>com
  new RegExp(`\\b[a-z0-9][a-z0-9-]*\\s*(?:[[({<]\\s*(?:\\.|dot)\\s*[\\]})>]|\\bdot\\b)\\s*(?:${ENDINGS})\\b`, 'i'),
  // example . com (lowercase only, so a normal sentence like "It's sold. Com..." isn't caught)
  /\b[a-z0-9][a-z0-9-]* +\. *(?:com|net|org|xyz|ru|ca)\b|\b[a-z0-9][a-z0-9-]* *\. +(?:com|net|org|xyz|ru|ca)\b/,
];

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;

/** Look-alike dots become real dots and invisible characters are removed before checking. */
function normalize(text: string): string {
  return text.replace(/[。．｡]/g, '.').replace(/[​-‍⁠﻿­]/g, '');
}

/** The first link or web address found in the text (to show the sender), or null. */
export function findLink(text: string): string | null {
  if (!text) return null;
  const t = normalize(text).replace(EMAIL, ' ');
  for (const p of PATTERNS) {
    const m = t.match(p);
    if (m) return m[0].trim();
  }
  return null;
}

export const LINK_BLOCKED_MESSAGE =
  'For your safety, links and web addresses can’t be sent in OwnersMarket messages. ' +
  'Please remove it and describe things in words instead. Email addresses are fine.';

/** The error shown to the sender, naming what was found. */
export function linkBlockedMessage(found: string): string {
  return `For your safety, links and web addresses can’t be sent in OwnersMarket messages. Please remove “${found}” and try again. Email addresses are fine.`;
}
