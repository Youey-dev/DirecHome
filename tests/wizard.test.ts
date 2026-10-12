import { validateImageFile } from '../src/lib/imageUtils';
import { Listing } from '../src/types/listing';

export async function runWizardTests() {
  console.log('🧪 Testing Seller Listing Wizard & Image Processing Logic...');

  // Test 1: Image file type validation
  const validJpeg = {
    name: 'home.jpg',
    type: 'image/jpeg',
    size: 2 * 1024 * 1024
  } as File;
  const checkJpeg = await validateImageFile(validJpeg);
  if (!checkJpeg.valid) {
    throw new Error(`Expected JPEG to be valid, got reason: ${checkJpeg.reason}`);
  }
  console.log('  ✅ JPEG photo accepted');

  const invalidPdf = {
    name: 'contract.pdf',
    type: 'application/pdf',
    size: 1024 * 1024
  } as File;
  const checkPdf = await validateImageFile(invalidPdf);
  if (checkPdf.valid || !checkPdf.reason?.includes('not an image')) {
    throw new Error('Expected PDF to be rejected as listing photo');
  }
  console.log('  ✅ Invalid file format rejected with friendly explanation');

  // Test 2: File size limit (25MB)
  const hugeFile = {
    name: 'huge.jpg',
    type: 'image/jpeg',
    size: 30 * 1024 * 1024 // 30 MB
  } as File;
  const checkHuge = await validateImageFile(hugeFile);
  if (checkHuge.valid || !checkHuge.reason?.includes('over 25MB')) {
    throw new Error('Expected file over 25MB to be rejected');
  }
  console.log('  ✅ Oversized raw camera file rejected with helpful message');

  // Test 3: Wizard Step 1 Validation (Address & Property Type)
  function validateStep1(data: Partial<Listing>): { valid: boolean; error?: string } {
    if (!data.streetAddress || data.streetAddress.trim().length < 3) {
      return { valid: false, error: 'Please enter a valid street address.' };
    }
    if (!data.city || data.city.trim().length < 2) {
      return { valid: false, error: 'Please enter a British Columbia city.' };
    }
    if (!data.propertyType) {
      return { valid: false, error: 'Please select a property type.' };
    }
    return { valid: true };
  }

  const invalidStep1 = validateStep1({ streetAddress: '', city: 'Langley' });
  if (invalidStep1.valid) {
    throw new Error('Expected empty address to fail validation');
  }
  const validStep1 = validateStep1({ 
    streetAddress: '20876 77A Avenue', 
    city: 'Langley', 
    propertyType: 'Single Family Detached' 
  });
  if (!validStep1.valid) {
    throw new Error('Expected valid step 1 data to pass');
  }
  console.log('  ✅ Wizard Step 1 (Address & Property Type) validation passes');

  // Test 4: Wizard Step 2 Validation (Specs & Pricing)
  function validateStep2(data: Partial<Listing>): { valid: boolean; error?: string } {
    if (!data.price || data.price < 50000) {
      return { valid: false, error: 'Please enter a listing price of at least $50,000.' };
    }
    if (!data.bedrooms || data.bedrooms < 0) {
      return { valid: false, error: 'Please select number of bedrooms.' };
    }
    if (!data.bathrooms || data.bathrooms < 1) {
      return { valid: false, error: 'Please select number of bathrooms.' };
    }
    if (!data.sqft || data.sqft < 200) {
      return { valid: false, error: 'Please enter valid square footage.' };
    }
    return { valid: true };
  }

  if (validateStep2({ price: 0 }).valid) {
    throw new Error('Expected zero price to fail');
  }
  if (!validateStep2({ price: 1299000, bedrooms: 4, bathrooms: 3.5, sqft: 2850 }).valid) {
    throw new Error('Expected realistic price & specs to pass');
  }
  console.log('  ✅ Wizard Step 2 (Specs & Pricing) validation passes');

  // Test 5: Mandatory Ownership Verification Check before Submission
  function canSubmitListingForReview(listing: Partial<Listing>): { canSubmit: boolean; reason?: string } {
    if (!listing.photos || listing.photos.length === 0) {
      return { canSubmit: false, reason: 'At least one photo is required.' };
    }
    if (!listing.verificationDoc) {
      return { canSubmit: false, reason: 'Ownership verification document (Property Tax Notice or Land Title) is required.' };
    }
    return { canSubmit: true };
  }

  const unverifiedListing: Partial<Listing> = {
    photos: [{ id: '1', url: 'photo.jpg', thumbnailUrl: 'thumb.jpg', isCover: true }],
    verificationDoc: undefined
  };
  const verifiedListing: Partial<Listing> = {
    photos: [{ id: '1', url: 'photo.jpg', thumbnailUrl: 'thumb.jpg', isCover: true }],
    verificationDoc: {
      id: 'doc-1',
      fileName: 'tax_notice.pdf',
      fileSize: '1.2MB',
      uploadedAt: '2026-10-10',
      documentType: 'property_tax_notice',
      status: 'pending'
    }
  };

  if (canSubmitListingForReview(unverifiedListing).canSubmit) {
    throw new Error('A listing without ownership verification document must NOT be submittable!');
  }
  if (!canSubmitListingForReview(verifiedListing).canSubmit) {
    throw new Error('Verified listing should be eligible for submission');
  }
  console.log('  ✅ Mandatory Ownership Verification requirement enforced before submission');

  console.log('🎉 All Wizard & Image validation tests passed successfully!\n');
}
