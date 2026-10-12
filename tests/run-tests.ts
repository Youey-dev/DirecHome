/**
 * DirectHome BC — Automated Test Suite Runner
 * Runs unit and integration tests for:
 * 1. BC Real Estate Commission & Cash-Back Calculator
 * 2. Row Level Security (RLS) & Privacy Policies
 * 3. Seller Listing Wizard & Image Processing
 */

import { runCalculatorTests } from './calculator.test';
import { runRlsPolicyTests } from './rls-policies.test';
import { runWizardTests } from './wizard.test';

async function main() {
  console.log('====================================================');
  console.log('🚀 DIRECTHOME BC — MVP AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  try {
    runCalculatorTests();
    runRlsPolicyTests();
    await runWizardTests();

    console.log('====================================================');
    console.log('✨ SUCCESS: ALL TEST SUITES PASSED WITHOUT ERRORS!');
    console.log('====================================================');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TEST FAILURE:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
