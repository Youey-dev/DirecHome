import { calculateBCCommission, COMMISSION_TAX, formatCAD } from '../src/lib/commissionCalc';

export function runCalculatorTests() {
  console.log('🧪 Testing BC Real Estate Commission & Cash-Back Calculator...');

  // Test 1: $100,000 property
  // 7% on $100,000 = $7,000. 5% GST = $350. Total = $7,350.
  const calc100k = calculateBCCommission(100000, false);
  if (calc100k.traditionalTotalCommission !== 7350) {
    throw new Error(`Expected $7,350 for $100k home, got ${calc100k.traditionalTotalCommission}`);
  }
  if (calc100k.listingAgentPortion !== 3675) {
    throw new Error(`Expected $3,675 seller agent listing portion on $100k, got ${calc100k.listingAgentPortion}`);
  }
  console.log('  ✅ $100,000 baseline tier passes ($7,350 total commission, $3,675 listing side)');

  // Test 2: $1,000,000 property with $10,000 cash-back
  // 7% on $100,000 = $7,000
  // 2.5% on $900,000 = $22,500
  // Subtotal = $29,500. GST (5%) = $1,475. Total = $30,975.
  const calc1M = calculateBCCommission(1000000, true, 'fixed', 10000);
  if (calc1M.traditionalTotalCommission !== 30975) {
    throw new Error(`Expected $30,975 for $1M home, got ${calc1M.traditionalTotalCommission}`);
  }
  if (calc1M.listingAgentPortion !== 15488) {
    throw new Error(`Expected $15,488 seller listing commission portion, got ${calc1M.listingAgentPortion}`);
  }
  if (calc1M.offeredCashback !== 10000) {
    throw new Error(`Expected $10,000 cashback, got ${calc1M.offeredCashback}`);
  }
  // Net savings with cashback: $30,975 - $10,000 = $20,975
  if (calc1M.netSellerSavingsWithCashback !== 20975) {
    throw new Error(`Expected $20,975 net savings with cashback, got ${calc1M.netSellerSavingsWithCashback}`);
  }
  console.log('  ✅ $1,000,000 benchmark tier with $10,000 cash-back passes');

  // Test 3: Percentage mode cash-back
  // $1,299,000 home with 1.5% cash-back
  // 1.5% of $1,299,000 = $19,485
  const calcPercentage = calculateBCCommission(1299000, true, 'percentage', 1.5);
  if (calcPercentage.offeredCashback !== 19485) {
    throw new Error(`Expected $19,485 cashback for 1.5% of $1,299,000, got ${calcPercentage.offeredCashback}`);
  }
  console.log('  ✅ Percentage cash-back calculation passes');

  // Test 4: Currency formatting helper
  if (formatCAD(1299000) !== '$1,299,000') {
    throw new Error(`Expected '$1,299,000', got '${formatCAD(1299000)}'`);
  }
  if (formatCAD(0) !== '$0') {
    throw new Error(`Expected '$0', got '${formatCAD(0)}'`);
  }
  console.log('  ✅ Currency formatter passes');

  // Test 5: GST or HST by province (matches the examples in the "cost to sell" guides)
  const examples: [string, number, number][] = [
    ['ON', 850000, 29098], // 13% HST
    ['BC', 900000, 28350], // 5% GST
    ['AB', 500000, 17850], // 5% GST
  ];
  for (const [prov, price, total] of examples) {
    const got = calculateBCCommission(price, false, 'fixed', 0, prov).traditionalTotalCommission;
    if (got !== total) throw new Error(`Expected ${formatCAD(total)} on ${formatCAD(price)} in ${prov}, got ${formatCAD(got)}`);
  }
  const rates = Object.fromEntries(COMMISSION_TAX.map((t) => [t.code, t.rate]));
  if (rates.NS !== 0.14 || rates.NB !== 0.15 || rates.PE !== 0.15 || rates.NL !== 0.15 || rates.SK !== 0.05 || 'QC' in rates) {
    throw new Error('Commission tax rates by province are wrong');
  }
  if (!calculateBCCommission(850000, false, 'fixed', 0, 'ON').assumptions.includes('13% HST')) throw new Error('Assumptions must name the tax used');
  console.log('  ✅ GST/HST by province passes (Ontario $850,000 → $29,098)');

  console.log('🎉 All Calculator tests passed successfully!\n');
}
