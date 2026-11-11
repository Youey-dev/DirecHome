import { bracketTax, buyingCosts, minimumDownPayment, transferCosts } from '../src/lib/buyingCosts';
import { describeAlert } from '../src/lib/alerts';

export function runBuyingCostTests() {
  console.log('🧪 Testing buying costs and alert labels...');
  const eq = (got: unknown, want: unknown, what: string) => {
    if (got !== want) throw new Error(`${what}: expected ${want}, got ${got}`);
  };
  const amount = (lines: { label: string; amount: number }[], label: string) => lines.find((l) => l.label.startsWith(label))?.amount;

  // BC: $629,000 → 1% of 200k + 2% of 429k = $10,580; first-time buyers exempt on the first $500k ($8,000)
  const bc = transferCosts('BC', 'Chilliwack', 629_000, 0, true);
  eq(amount(bc, 'BC property transfer tax'), 10_580, 'BC PTT');
  eq(amount(bc, 'First-time'), -8_000, 'BC first-time exemption');
  // Phase-out between $835k and $860k
  eq(amount(transferCosts('BC', 'X', 850_000, 0, true), 'First-time'), -3_200, 'BC phase-out');
  eq(amount(transferCosts('BC', 'X', 900_000, 0, true), 'First-time'), undefined, 'BC no exemption above $860k');
  // Over $3M: 5% on the part above $3M
  eq(bracketTax(3_500_000, [{ upTo: 200_000, rate: 0.01 }, { upTo: 2_000_000, rate: 0.02 }, { upTo: 3_000_000, rate: 0.03 }, { upTo: Infinity, rate: 0.05 }]), 2_000 + 36_000 + 30_000 + 25_000, 'BC over $3M');

  // Ontario $500,000 = $6,475; Toronto doubles it
  eq(amount(transferCosts('ON', 'Ottawa', 500_000, 0, false), 'Ontario'), 6_475, 'Ontario LTT');
  const to = transferCosts('ON', 'Toronto', 1_000_000, 0, true);
  eq(amount(to, 'Toronto land'), 16_475, 'Toronto MLTT');
  eq(amount(to, 'Toronto first-time'), -4_475, 'Toronto rebate');
  eq(amount(to, 'First-time buyer refund'), -4_000, 'Ontario refund');

  // Minimum down payment
  eq(minimumDownPayment(400_000), 20_000, 'min down 400k');
  eq(minimumDownPayment(600_000), 35_000, 'min down 600k');
  eq(minimumDownPayment(1_600_000), 320_000, 'min down 1.6M');

  // $629,000, 10% down, 4.5%, 25 years: insured loan $583,649, about $3,230 a month
  const r = buyingCosts({ price: 629_000, down: 62_900, ratePct: 4.5, years: 25, propertyTaxYear: 2_820, strataMonth: 235, province: 'BC', city: 'Chilliwack', firstTime: true });
  eq(r.premium, 17_549, 'CMHC premium');
  eq(Math.round(r.mortgageMonth), 3_230, 'monthly payment');
  eq(r.downTooLow, false, 'down payment ok');
  eq(r.premiumTax, 0, 'no premium tax in BC');
  // Ontario charges 8% sales tax on the premium
  eq(buyingCosts({ price: 500_000, down: 25_000, ratePct: 5, years: 25, propertyTaxYear: 0, strataMonth: 0, province: 'ON', city: 'Ottawa', firstTime: false }).premiumTax, 1_520, 'ON premium tax');

  // Alert labels
  eq(describeAlert({ query: 'Abbotsford', propertyType: 'Single Family Detached', minBeds: 3, maxPrice: 900_000 }), '3+ bed houses matching “Abbotsford” under $900,000', 'alert label');
  eq(describeAlert({}), 'Homes across Canada', 'empty alert label');
  console.log('✅ Buying costs and alert labels OK');
}
