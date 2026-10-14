import React, { useState, useEffect, useRef } from 'react';
import { Listing, PropertyType, PhotoItem, UserProfile } from '../types/listing';
import { db, TERMS_VERSION } from '../lib/db';
import { geocodeBCAddress } from '../lib/geocode';
import { BC_CITY_INFO } from '../data/cities';
import { validateImageFile, processAndResizeImage } from '../lib/imageUtils';
import { calculateBCCommission, formatCAD } from '../lib/commissionCalc';
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Camera, 
  FileText, 
  Gift, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Trash2, 
  Star, 
  AlertCircle, 
  Lock, 
  Sparkles,
  HelpCircle,
  Eye,
  ShieldAlert
} from 'lucide-react';
import { sanitizeHtml, stripHtml, validateBCPostalCode } from '../lib/security';
interface WizardPageProps {
  activeUser: UserProfile;
  onListingCreated: () => void;
  onCancel: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

const STEPS = [
  { id: 1, title: 'Address & Type', subtitle: 'Where is your home located?' },
  { id: 2, title: 'Details & Price', subtitle: 'Size, rooms, and asking price' },
  { id: 3, title: 'Photos', subtitle: 'Upload clear photos (resized on device)' },
  { id: 4, title: 'Description', subtitle: 'What makes your home special?' },
  { id: 5, title: 'Cash-Back Offer', subtitle: 'Pass commission savings to buyers' },
  { id: 6, title: 'Ownership Proof', subtitle: 'Private land title or tax notice' },
  { id: 7, title: 'Review & Submit', subtitle: 'Confirm and launch your listing' }
];

type DocType = 'property_tax_notice' | 'land_title_search' | 'bc_assessment' | 'other';
const DOC_LABELS: Record<DocType, string> = {
  property_tax_notice: 'BC Property Tax Notice (municipal tax bill)',
  land_title_search: 'Land Title Search (LTSA)',
  bc_assessment: 'BC Assessment notice',
  other: 'Other proof of ownership',
};
const DOC_MAX_BYTES = 10 * 1024 * 1024;
const DOC_TYPES_OK = ['application/pdf', 'image/jpeg', 'image/png'];

export const WizardPage: React.FC<WizardPageProps> = ({
  activeUser,
  onListingCreated,
  onCancel,
  onOpenAuth
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadingProgress, setUploadingProgress] = useState<Record<string, number>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ streetAddress: string; city: string; price: number; offersCashback: boolean; cashbackAmount: number; photoCount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoKey, setGeoKey] = useState('');
  // One id for this listing for the whole session, so a retry never creates a duplicate
  const listingIdRef = useRef<string>(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '');
  const [existingDoc, setExistingDoc] = useState<{ fileName: string; status: 'pending' | 'verified' | 'rejected' } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form State
  const [streetAddress, setStreetAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [city, setCity] = useState('Langley');
  const [postalCode, setPostalCode] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Single Family Detached');
  const [lat, setLat] = useState(49.1432);
  const [lng, setLng] = useState(-122.6582);

  // Step 2 Specs
  const [price, setPrice] = useState<number>(0);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [sqft, setSqft] = useState<number>(0);
  const [lotSqft, setLotSqft] = useState<number>(0);
  const [lotAcres, setLotAcres] = useState<number | undefined>(undefined);
  const [yearBuilt, setYearBuilt] = useState<number>(0);
  const [parkingSpaces, setParkingSpaces] = useState<number>(1);
  const [strataFee, setStrataFee] = useState<number>(0);
  const [propertyTaxesAnnual, setPropertyTaxesAnnual] = useState<number>(0);

  // Step 3 Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  // Step 4 Description
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [neighborhoodHighlights, setNeighborhoodHighlights] = useState('');
  const [upgradesInput, setUpgradesInput] = useState('');
  const [inclusionsInput, setInclusionsInput] = useState('');

  // Step 5 Cash-back
  const [offersCashback, setOffersCashback] = useState(false);
  const [cashbackType, setCashbackType] = useState<'fixed' | 'percentage'>('fixed');
  const [cashbackAmount, setCashbackAmount] = useState(10000);

  // Step 6 Ownership verification
  const [verificationFile, setVerificationFile] = useState<{ file: File; docType: DocType } | null>(null);
  const [docType, setDocType] = useState<DocType>('property_tax_notice');

  // Restore an unfinished draft (or a listing opened with "Edit") saved on this device
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    const draft = db.getDraft();
    if (!draft) return;
    if (draft.id) {
      setEditingId(draft.id);
      listingIdRef.current = draft.id;
    }
    if (draft.streetAddress) setStreetAddress(draft.streetAddress);
    if (draft.unitNumber) setUnitNumber(draft.unitNumber);
    if (draft.city) setCity(draft.city);
    if (draft.postalCode) setPostalCode(draft.postalCode);
    if (draft.neighborhood) setNeighborhood(draft.neighborhood);
    if (draft.propertyType) setPropertyType(draft.propertyType);
    if (typeof draft.lat === 'number') setLat(draft.lat);
    if (typeof draft.lng === 'number') setLng(draft.lng);
    if (draft.price) setPrice(draft.price);
    if (draft.bedrooms !== undefined) setBedrooms(draft.bedrooms);
    if (draft.bathrooms) setBathrooms(draft.bathrooms);
    if (draft.sqft) setSqft(draft.sqft);
    if (draft.lotSqft) setLotSqft(draft.lotSqft);
    if (draft.lotAcres) setLotAcres(draft.lotAcres);
    if (draft.yearBuilt) setYearBuilt(draft.yearBuilt);
    if (draft.parkingSpaces !== undefined) setParkingSpaces(draft.parkingSpaces);
    if (draft.strataFee) setStrataFee(draft.strataFee);
    if (draft.propertyTaxesAnnual) setPropertyTaxesAnnual(draft.propertyTaxesAnnual);
    if (draft.headline) setHeadline(draft.headline);
    if (draft.description) setDescription(draft.description);
    if (draft.neighborhoodHighlights) setNeighborhoodHighlights(draft.neighborhoodHighlights);
    if (Array.isArray(draft.recentUpgrades)) setUpgradesInput(draft.recentUpgrades.join(', '));
    else if (draft.upgradesInput) setUpgradesInput(draft.upgradesInput);
    if (Array.isArray(draft.inclusions)) setInclusionsInput(draft.inclusions.join(', '));
    else if (draft.inclusionsInput) setInclusionsInput(draft.inclusionsInput);
    if (typeof draft.offersCashback === 'boolean') setOffersCashback(draft.offersCashback);
    if (draft.cashbackType) setCashbackType(draft.cashbackType);
    if (draft.cashbackAmount) setCashbackAmount(draft.cashbackAmount);
    if (draft.verificationDoc?.fileName) {
      setExistingDoc({ fileName: draft.verificationDoc.fileName, status: draft.verificationDoc.status });
    }
    // Only photos that are already uploaded come back; new photos are not stored on the device
    if (Array.isArray(draft.photos)) {
      setPhotos(draft.photos.filter((p: PhotoItem) => typeof p.url === 'string' && p.url.startsWith('http')));
    }
  }, []);

  // Autosave text fields on this device (new photos and documents are not kept until you submit)
  useEffect(() => {
    if (isSubmittedSuccess) return;
    const timer = setTimeout(() => {
      db.saveDraft({
        id: editingId ?? undefined,
        streetAddress,
        unitNumber,
        city,
        postalCode,
        neighborhood,
        propertyType,
        lat,
        lng,
        price,
        bedrooms,
        bathrooms,
        sqft,
        lotSqft,
        lotAcres,
        yearBuilt,
        parkingSpaces,
        strataFee,
        propertyTaxesAnnual,
        headline,
        description,
        neighborhoodHighlights,
        upgradesInput,
        inclusionsInput,
        photos: photos.filter((p) => p.url.startsWith('http')),
        offersCashback,
        cashbackType,
        cashbackAmount,
        verificationDoc: existingDoc ?? undefined
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);

    return () => clearTimeout(timer);
  }, [
    streetAddress, unitNumber, city, postalCode, neighborhood, propertyType, lat, lng,
    price, bedrooms, bathrooms, sqft, lotSqft, lotAcres, yearBuilt, parkingSpaces, strataFee, propertyTaxesAnnual,
    headline, description, neighborhoodHighlights, upgradesInput, inclusionsInput, photos,
    offersCashback, cashbackType, cashbackAmount, existingDoc, editingId, isSubmittedSuccess
  ]);

  // Live Commission calculations
  const commissionBreakdown = calculateBCCommission(price, offersCashback, cashbackType, cashbackAmount);

  // Photo Upload Handler with Browser Resizing & Validation
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setValidationError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `temp-${Date.now()}-${i}`;

      // 1. Validate file (size, dimension, tiny/blurry rejection)
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        setValidationError(validation.reason || 'Image does not meet quality requirements.');
        continue;
      }

      // 2. Set initial progress
      setUploadingProgress((prev) => ({ ...prev, [tempId]: 20 }));

      try {
        // 3. Process & resize in browser (< 2000px, 4:3 thumb)
        const processed = await processAndResizeImage(file, photos.length === 0, (prog) => {
          setUploadingProgress((prev) => ({ ...prev, [tempId]: prog }));
        });

        setPhotos((prev) => [
          ...prev,
          {
            id: processed.id,
            url: processed.url,
            thumbnailUrl: processed.thumbnailUrl,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            isCover: prev.length === 0,
            width: processed.width,
            height: processed.height,
            fileSize: processed.fileSize
          }
        ]);

        // Clear progress
        setUploadingProgress((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      } catch (err: any) {
        setValidationError(`Failed to process ${file.name}: ${err.message || 'unknown error'}`);
      }
    }

    // Reset input
    e.target.value = '';
  };

  const setCoverPhoto = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        isCover: p.id === photoId
      }))
    );
  };

  const removePhoto = (photoId: string) => {
    setPhotos((prev) => {
      const remaining = prev.filter((p) => p.id !== photoId);
      if (remaining.length > 0 && !remaining.some((p) => p.isCover)) {
        remaining[0].isCover = true;
      }
      return remaining;
    });
  };

  // Step Navigation Validation
  const handleNext = async () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!streetAddress.trim()) {
        setValidationError('Please enter your street address.');
        return;
      }
      if (!validateBCPostalCode(postalCode).valid) {
        setValidationError('Please enter a valid BC postal code (e.g. V2Y 3K9).');
        return;
      }
      if (!neighborhood.trim()) {
        setValidationError('Please enter your neighbourhood name (shown publicly instead of your street address).');
        return;
      }
      // Place the home on the map. Falls back to the city centre if the lookup is unavailable.
      const key = `${streetAddress.trim()}|${city}`;
      if (geoKey !== key) {
        setLocating(true);
        const g = await geocodeBCAddress(streetAddress.trim(), city);
        setLat(g.lat);
        setLng(g.lng);
        setGeoKey(key);
        setLocating(false);
      }
    }

    if (currentStep === 2) {
      if (price <= 50000) {
        setValidationError('Please enter your asking price (minimum $50,000).');
        return;
      }
      if (sqft <= 100) {
        setValidationError('Please enter interior square footage (e.g. 1,800 sq ft).');
        return;
      }
      if (yearBuilt < 1800 || yearBuilt > new Date().getFullYear() + 1) {
        setValidationError('Please enter the year the home was built (e.g. 1998).');
        return;
      }
    }

    if (currentStep === 3) {
      if (photos.length < 2) {
        setValidationError('Please include at least 2 photos (recommended 10-40) so buyers can appreciate your home.');
        return;
      }
    }

    if (currentStep === 4) {
      if (headline.trim().length < 5 || headline.trim().length > 150) {
        setValidationError('Please write a headline for your listing (5 to 150 characters).');
        return;
      }
      if (description.trim().length < 30) {
        setValidationError('Please write at least a few sentences describing your home and neighbourhood.');
        return;
      }
    }

    if (currentStep === 6) {
      const hasUsableExisting = !!existingDoc && existingDoc.status !== 'rejected';
      if (!verificationFile && !hasUsableExisting) {
        setValidationError('Please upload your BC Property Tax Notice or Land Title search so we can verify ownership.');
        return;
      }
    }

    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDocumentPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!DOC_TYPES_OK.includes(file.type)) {
      setValidationError('Please upload a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > DOC_MAX_BYTES) {
      setValidationError('That file is larger than 10 MB. Please upload a smaller file or a lower-resolution scan.');
      return;
    }
    setValidationError(null);
    setVerificationFile({ file, docType });
  };

  const handleBack = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onCancel();
    }
  };

  // Final submit: saves everything to the database and sends the listing to the verification queue
  const handleFinalSubmit = async () => {
    if (submitting) return;
    if (!termsAccepted) {
      setValidationError('Please accept the DirectHome Terms of Use and Privacy Policy to submit your listing.');
      return;
    }

    const { formatted: formattedPostal } = validateBCPostalCode(postalCode);
    const upgradesList = upgradesInput.split(',').map((x) => stripHtml(x.trim())).filter(Boolean);
    const inclusionsList = inclusionsInput.split(',').map((x) => stripHtml(x.trim())).filter(Boolean);
    const finalCashback = offersCashback ? commissionBreakdown.offeredCashback : 0;

    setSubmitting(true);
    setValidationError(null);
    try {
      await db.saveListing({
        id: listingIdRef.current || undefined,
        streetAddress: stripHtml(streetAddress),
        unitNumber: unitNumber ? stripHtml(unitNumber) : undefined,
        postalCode: formattedPostal,
        city,
        neighborhood: stripHtml(neighborhood) || city,
        lat,
        lng,
        propertyType,
        price,
        bedrooms,
        bathrooms,
        sqft,
        lotSqft: lotSqft || undefined,
        lotAcres,
        yearBuilt,
        parkingSpaces,
        strataFee: propertyType === 'Condo / Apartment' || propertyType === 'Townhouse' ? strataFee : 0,
        propertyTaxesAnnual: propertyTaxesAnnual || undefined,
        offersCashback,
        cashbackType,
        cashbackAmount: finalCashback,
        estimatedCommissionSaved: commissionBreakdown.traditionalTotalCommission,
        headline: stripHtml(headline),
        description: stripHtml(description),
        neighborhoodHighlights: neighborhoodHighlights ? stripHtml(neighborhoodHighlights) : undefined,
        recentUpgrades: upgradesList,
        inclusions: inclusionsList,
        photos,
        verificationFile: verificationFile ? { file: verificationFile.file, docType: verificationFile.docType } : null,
      });
      db.clearDraft();
      setSubmittedSummary({
        streetAddress: stripHtml(streetAddress),
        city,
        price,
        offersCashback,
        cashbackAmount: finalCashback,
        photoCount: photos.length,
      });
      setIsSubmittedSuccess(true);
    } catch (err: any) {
      // Make sure a retry updates the listing that may already have been created
      await db.refresh();
      setValidationError(err?.message || 'Your listing could not be saved. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmittedSuccess && submittedSummary) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-12 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Your Listing is in Review!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
            We’ve received your listing for <strong>{submittedSummary.streetAddress}, {submittedSummary.city}</strong>. Our team reviews your ownership document before the listing is published to the marketplace. You can follow its status in your dashboard.
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Listing Summary
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
            <span className="text-slate-600">Asking Price</span>
            <span className="font-bold text-slate-900 tabular-nums">{formatCAD(submittedSummary.price)}</span>
          </div>
          {submittedSummary.offersCashback && (
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-600">Buyer Cash-Back</span>
              <span className="font-bold text-emerald-800 tabular-nums">+{formatCAD(submittedSummary.cashbackAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm py-1">
            <span className="text-slate-600">Photos Resized & Uploaded</span>
            <span className="font-medium text-slate-800 tabular-nums">{submittedSummary.photoCount} photos</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onListingCreated()}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all shadow-sm min-h-[44px]"
          >
            Go to Seller Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-6 pb-20">
      
      {/* Top Header Bar: Step info + Live Saved Indicator */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-800 uppercase tracking-wider">
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
          </span>
          <span className="text-slate-400 flex items-center gap-1.5 tabular-nums">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Saved to draft ({lastSaved})</span>
          </span>
        </div>

        {/* Thin Modern Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-700 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Wizard Form Card (One question group per screen) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Step Title & Subtitle */}
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {STEPS[currentStep - 1].subtitle}
          </p>
        </div>

        {/* Actionable Error Banner if validation fails */}
        {validationError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Please fix the following:</span>
              <span>{validationError}</span>
            </div>
          </div>
        )}

        {/* ---------------- STEP 1: Address & Property Type ---------------- */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-900">
              🔒 Your exact street address stays private. Buyers only see your neighbourhood and an approximate map area until you confirm a viewing.
            </div>

            {/* Street Address */}
            <div>
              <label htmlFor="wizard-street-address" className="block text-sm font-semibold text-slate-900 mb-1">
                Civic Street Address
              </label>
              <input
                id="wizard-street-address"
                type="text"
                placeholder="e.g. 20876 77A Avenue"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Your exact street number is kept private until you approve a buyer's viewing request.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="wizard-unit-number" className="block text-xs font-semibold text-slate-700 mb-1">Unit / Suite # (Optional)</label>
                <input
                  id="wizard-unit-number"
                  type="text"
                  placeholder="e.g. 104"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-city-select" className="block text-xs font-semibold text-slate-700 mb-1">City / Municipality</label>
                <select
                  id="wizard-city-select"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                >
                  {['Langley', 'Surrey', 'Abbotsford', 'Burnaby', 'Vancouver', 'Coquitlam', 'Chilliwack', 'Richmond', 'White Rock', 'Maple Ridge', 'Delta', 'Mission'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wizard-postal-code" className="block text-xs font-semibold text-slate-700 mb-1">Postal Code</label>
                <input
                  id="wizard-postal-code"
                  type="text"
                  placeholder="e.g. V2Y 3K9"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>
            </div>

            {/* Neighborhood */}
            <div>
              <label htmlFor="wizard-neighborhood" className="block text-xs font-semibold text-slate-700 mb-1">
                Neighborhood Name
              </label>
              <input
                id="wizard-neighborhood"
                type="text"
                placeholder="e.g. Willoughby Heights, Walnut Grove, Kitsilano..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
              />
            </div>

            {/* Property Type Radio Cards */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Property Type
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Single Family Detached',
                  'Townhouse',
                  'Condo / Apartment',
                  'Duplex / Half-Duplex',
                  'Acreage / Farm'
                ].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setPropertyType(t as PropertyType)}
                    className={`p-3.5 rounded-xl border text-left text-sm font-semibold transition-all min-h-[48px] flex items-center justify-between ${
                      propertyType === t
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t}</span>
                    {propertyType === t && <span className="text-emerald-700 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: Details & Price ---------------- */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Price */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label htmlFor="wizard-asking-price" className="text-sm font-semibold text-slate-900">
                  Asking Price ($ CAD)
                </label>
                <span className="text-xl font-extrabold text-slate-900 tabular-nums">
                  {formatCAD(price)}
                </span>
              </div>
              <input
                id="wizard-asking-price"
                type="number"
                step="5000"
                min="50000"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Direct sellers price fairly based on recent neighbourhood sales without broker markup.
              </span>
            </div>

            {/* Beds and Baths */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="wizard-bedrooms" className="block text-xs font-semibold text-slate-700 mb-1">Bedrooms</label>
                <input
                  id="wizard-bedrooms"
                  type="number"
                  min="0"
                  max="12"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-bathrooms" className="block text-xs font-semibold text-slate-700 mb-1">Bathrooms</label>
                <input
                  id="wizard-bathrooms"
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>
            </div>

            {/* Size & Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="wizard-interior-sqft" className="block text-xs font-semibold text-slate-700 mb-1">Interior Area (Sq Ft)</label>
                <input
                  id="wizard-interior-sqft"
                  type="number"
                  step="25"
                  placeholder="e.g. 2400"
                  value={sqft || ''}
                  onChange={(e) => setSqft(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-lot-sqft" className="block text-xs font-semibold text-slate-700 mb-1">Lot Size (Sq Ft)</label>
                <input
                  id="wizard-lot-sqft"
                  type="number"
                  placeholder="e.g. 5000"
                  value={lotSqft || ''}
                  onChange={(e) => setLotSqft(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-year-built" className="block text-xs font-semibold text-slate-700 mb-1">Year Built</label>
                <input
                  id="wizard-year-built"
                  type="number"
                  placeholder="e.g. 2018"
                  value={yearBuilt || ''}
                  onChange={(e) => setYearBuilt(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>
            </div>

            {/* Parking & Taxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="wizard-parking-spaces" className="block text-xs font-semibold text-slate-700 mb-1">Parking Stalls</label>
                <input
                  id="wizard-parking-spaces"
                  type="number"
                  min="0"
                  value={parkingSpaces}
                  onChange={(e) => setParkingSpaces(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-annual-taxes" className="block text-xs font-semibold text-slate-700 mb-1">Annual Taxes ($ CAD)</label>
                <input
                  id="wizard-annual-taxes"
                  type="number"
                  placeholder="e.g. 4800"
                  value={propertyTaxesAnnual || ''}
                  onChange={(e) => setPropertyTaxesAnnual(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              {(propertyType === 'Condo / Apartment' || propertyType === 'Townhouse') && (
                <div>
                  <label htmlFor="wizard-strata-fee" className="block text-xs font-semibold text-slate-700 mb-1">Monthly Strata ($)</label>
                  <input
                    id="wizard-strata-fee"
                    type="number"
                    placeholder="e.g. 350"
                    value={strataFee}
                    onChange={(e) => setStrataFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 3: Photos (Direct & Resized) ---------------- */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Automatic Mobile Photo Optimizer</span>
              </div>
              <p>
                Photos taken on your iPhone or Android phone are resized right in your browser (max 2000px long side) with thumbnail generation. Upload is fast and won't use heavy mobile data.
              </p>
            </div>

            {/* Upload Drop Zone / Button */}
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-700 rounded-2xl p-6 sm:p-8 text-center transition-colors bg-slate-50/50">
              <input
                id="photo-input"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <label
                htmlFor="photo-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Tap to upload photos or take picture
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Select 10 to 40 photos · JPG, PNG, HEIC · Min 600px wide
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm">
                  Choose Files from Phone or Computer
                </div>
              </label>
            </div>

            {/* Uploading progress indicators */}
            {Object.keys(uploadingProgress).length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="font-semibold flex items-center gap-2">
                  <Upload className="w-4 h-4 animate-bounce text-emerald-700" />
                  <span>Resizing and processing photos on device...</span>
                </div>
                {Object.entries(uploadingProgress).map(([id, prog]) => (
                  <div key={id} className="w-full bg-emerald-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-700 h-full transition-all" style={{ width: `${prog}%` }} />
                  </div>
                ))}
              </div>
            )}

            {/* Current Photos Grid */}
            <div>
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-700">
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'} uploaded
                </span>
                <span className="text-slate-400">
                  Tap "Set Cover" to choose the main search photo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                  >
                    <img
                      src={photo.thumbnailUrl || photo.url}
                      alt={photo.caption || 'Home photo'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />

                    {/* Cover badge */}
                    {photo.isCover && (
                      <div className="absolute top-2 left-2 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        <span>Cover</span>
                      </div>
                    )}

                    {/* Overlay actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                      {!photo.isCover && (
                        <button
                          type="button"
                          onClick={() => setCoverPhoto(photo.id)}
                          className="px-2 py-1 bg-white text-slate-800 text-[10px] font-bold rounded shadow-sm hover:bg-slate-100 cursor-pointer"
                        >
                          Set Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="p-1.5 bg-rose-600 text-white rounded shadow-sm hover:bg-rose-700 cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 4: Description with Guided Prompts ---------------- */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="wizard-listing-headline" className="block text-sm font-semibold text-slate-900 mb-1">
                Listing Headline
              </label>
              <input
                id="wizard-listing-headline"
                type="text"
                placeholder="e.g. Custom Craftsman Family Home with Sunny South-Facing Yard"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Keep it concise and highlight the biggest asset.</span>
            </div>

            <div>
              <label htmlFor="wizard-full-description" className="block text-sm font-semibold text-slate-900 mb-1">
                Full Description
              </label>
              <textarea
                id="wizard-full-description"
                rows={5}
                placeholder="Describe your home, living spaces, sunlight, outdoor living, and why you loved living here..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm leading-relaxed"
              />
            </div>

            {/* Prompt helpers */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="wizard-recent-upgrades" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Recent Upgrades (Comma Separated)
                </label>
                <input
                  id="wizard-recent-upgrades"
                  type="text"
                  placeholder="e.g. Heat pump with A/C (2023), EV charger, Roof replaced 2021"
                  value={upgradesInput}
                  onChange={(e) => setUpgradesInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-inclusions" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Inclusions (What Stays with the Home?)
                </label>
                <input
                  id="wizard-inclusions"
                  type="text"
                  placeholder="e.g. Bosch appliances, washer & dryer, garden shed, custom blinds"
                  value={inclusionsInput}
                  onChange={(e) => setInclusionsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="wizard-neighborhood-highlights" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Neighborhood & School Notes
                </label>
                <input
                  id="wizard-neighborhood-highlights"
                  type="text"
                  placeholder="e.g. 5 min walk to Yorkson Middle School, 4 min to Carvolth Express Bus"
                  value={neighborhoodHighlights}
                  onChange={(e) => setNeighborhoodHighlights(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 5: Cash-Back & Live BC Commission Simulator ---------------- */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Gift className="w-4 h-4 text-emerald-700" />
                <span>The DirectHome Cash-Back Superpower</span>
              </div>
              <p className="text-xs text-emerald-950/90 leading-relaxed">
                MLS listings pay 2.5% to 5% in commissions. On your {formatCAD(price)} home, that would be <strong>{formatCAD(commissionBreakdown.traditionalTotalCommission)}</strong>. By listing yourself, you can pass e.g. $10,000 to $20,000 as a cash-back credit to your buyer, and still keep the rest!
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">Offer Buyer Cash-Back at Completion?</div>
                <div className="text-xs text-slate-500">Credited on the lawyer's Statement of Adjustments</div>
              </div>
              <input
                type="checkbox"
                checked={offersCashback}
                onChange={(e) => setOffersCashback(e.target.checked)}
                className="w-5 h-5 accent-emerald-700 rounded cursor-pointer"
              />
            </div>

            {offersCashback && (
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Cash-Back Amount
                  </span>
                  <span className="text-lg font-bold text-emerald-800 tabular-nums">
                    {formatCAD(cashbackAmount)}
                  </span>
                </div>

                <input
                  type="range"
                  min="2500"
                  max="40000"
                  step="2500"
                  value={cashbackAmount}
                  onChange={(e) => setCashbackAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-700"
                />

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <div className="text-slate-400">Buyer Receives:</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      {formatCAD(cashbackAmount)} credit
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-200">
                    <div className="text-emerald-800 font-medium">You Still Keep:</div>
                    <div className="text-base font-bold text-emerald-900 mt-0.5 tabular-nums">
                      {formatCAD(commissionBreakdown.netSellerSavingsWithCashback)} net savings
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                  <div className="font-semibold text-slate-800">Legal Term Requirement:</div>
                  <p>
                    This cash-back is your voluntary offer as the seller, not a platform guarantee. It must be explicitly written into the standard BC Contract of Purchase and Sale and will be credited to the buyer on the Statement of Adjustments at closing by the conveyancers.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------- STEP 6: Ownership Verification ---------------- */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span>100% Private Ownership Audit</span>
              </div>
              <p>
                To protect BC homebuyers from fraudulent or fake listings, DirectHome requires verified proof that you own this property before your listing goes live.
              </p>
              <p className="text-emerald-800 font-medium">
                🔒 Stored in an encrypted PRIVATE storage bucket. This document is NEVER visible to buyers or the public.
              </p>
            </div>

            {/* Document upload box */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/50 space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-700 mx-auto" />
              <div>
                <div className="text-sm font-bold text-slate-900">
                  Upload BC Property Tax Notice or Land Title Search
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  PDF, JPG, or PNG (from municipal annual tax bill or LTSA)
                </div>
              </div>

              <div className="max-w-sm mx-auto text-left">
                <label htmlFor="wizard-doc-type" className="block text-xs font-semibold text-slate-700 mb-1">
                  Document type
                </label>
                <select
                  id="wizard-doc-type"
                  value={docType}
                  onChange={(e) => {
                    const t = e.target.value as DocType;
                    setDocType(t);
                    if (verificationFile) setVerificationFile({ ...verificationFile, docType: t });
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
                >
                  {(Object.keys(DOC_LABELS) as DocType[]).map((k) => (
                    <option key={k} value={k}>{DOC_LABELS[k]}</option>
                  ))}
                </select>
              </div>

              {verificationFile ? (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 inline-flex items-center gap-3 text-xs text-left shadow-sm">
                  <FileText className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 break-all">{verificationFile.file.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {(verificationFile.file.size / (1024 * 1024)).toFixed(1)} MB · uploads when you submit
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVerificationFile(null)}
                    aria-label="Remove document"
                    className="p-1 hover:text-rose-600 text-slate-400 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {existingDoc && (
                    <div className="text-xs text-slate-600">
                      Document on file: <strong>{existingDoc.fileName}</strong> ({existingDoc.status}).
                      {existingDoc.status === 'rejected' && ' Please upload a new document.'}
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-800">
                    <Upload className="w-4 h-4" />
                    <span>{existingDoc ? 'Upload a new document' : 'Choose file'}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={handleDocumentPick}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 7: Review & Submit ---------------- */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{headline}</h3>
                  <div className="text-xs text-slate-500">{streetAddress}, {city}, BC</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold text-slate-900 tabular-nums">{formatCAD(price)}</div>
                  <div className="text-xs text-slate-500">{propertyType}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400">Bedrooms:</span> <strong className="text-slate-900">{bedrooms}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400">Bathrooms:</span> <strong className="text-slate-900">{bathrooms}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400">Area:</span> <strong className="text-slate-900">{sqft} sqft</strong>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/60">
                  <span className="text-slate-400">Photos:</span> <strong className="text-slate-900">{photos.length}</strong>
                </div>
              </div>

              {offersCashback && (
                <div className="bg-emerald-100/70 p-3 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                  <span>Buyer Cash-Back Incentive Offered:</span>
                  <span className="font-bold text-emerald-900 tabular-nums">+{formatCAD(cashbackAmount)}</span>
                </div>
              )}
            </div>

            {/* Legal Confirmation & Mandatory Terms Acceptance */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>DirectHome BC Legal Declaration & Representation</span>
              </div>
              <p className="text-slate-600">
                You declare that you are the registered legal owner of this property, that all representations and inclusions are accurate, and that you understand DirectHome BC is strictly an advertising marketplace, not a licensed real estate brokerage.
              </p>

              {/* Mandatory Acceptance Checkbox */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-300 cursor-pointer hover:border-emerald-700 transition-colors">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (e.target.checked) setValidationError(null);
                  }}
                  className="w-5 h-5 accent-emerald-700 rounded cursor-pointer mt-0.5 shrink-0"
                />
                <div className="text-xs text-slate-800 leading-normal">
                  <span className="font-semibold text-slate-900">I have read and agree to the </span>
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-800 font-bold underline">Terms of Use</a>
                  <span className="font-semibold text-slate-900"> and </span>
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-800 font-bold underline">Privacy Policy</a>.
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    We record the date and version you accepted ({TERMS_VERSION}).
                  </span>
                </div>
              </label>

            </div>
          </div>
        )}

        {/* ---------------- Navigation Buttons (Always visible, 44px+ min touch hitbox) ---------------- */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentStep === 1 ? 'Cancel' : 'Back'}</span>
          </button>

          {currentStep < 7 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={locating}
              className="disabled:opacity-60 px-7 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-semibold text-sm rounded-xl transition-all shadow-sm min-h-[44px] flex items-center gap-2 cursor-pointer"
            >
              <span>{locating ? 'Locating your home…' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="disabled:opacity-60 px-8 py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-md min-h-[48px] flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{submitting ? 'Uploading… please keep this page open' : 'Submit Listing for Verification'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
