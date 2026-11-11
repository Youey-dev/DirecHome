/**
 * The offer on the homepage ("Your first 3 months are on us") is chosen in
 * Admin → Promotions → Homepage offer, and read with db.loadHomepagePromo().
 * These helpers remember a clicked offer in this browser, so the dashboard's
 * "Have a promo code?" box opens with it filled in.
 */
export interface HomepagePromo {
  code: string;
  months: number;
}

const KEY = 'om_promo_code';

export function rememberPromo(code: string): void {
  try {
    localStorage.setItem(KEY, code);
  } catch {
    /* private window: the seller can still type the code */
  }
}

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
