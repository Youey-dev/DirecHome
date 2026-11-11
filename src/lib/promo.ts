/**
 * The promotion advertised on the homepage ("Your first 3 months are on us").
 *
 * To change or end it, edit SITE_PROMO and publish:
 *  - `code` must exist and be active in Admin → Promotions (No card), with the same number of months;
 *  - set SITE_PROMO to null to hide the homepage bar and line.
 * Sellers who click the offer have the code filled in for them on their dashboard later.
 */
export const SITE_PROMO: { code: string; months: number } | null = { code: 'SPRING3', months: 3 };

const KEY = 'om_promo_code';

/** Remembers the advertised code in this browser, for the dashboard's "Have a promo code?" box. */
export function rememberPromo(code: string): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* private window: the seller can still type the code */
  }
}

/** The code remembered from the homepage offer, if any. */
export function rememberedPromo(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const DISMISS_KEY = 'om_promo_bar_closed';

export function promoBarClosed(code: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === code;
  } catch {
    return false;
  }
}

export function closePromoBar(code: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, code);
  } catch {
    /* ignore */
  }
}
