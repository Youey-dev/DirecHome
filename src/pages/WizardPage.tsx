import React, { useState, useEffect, useRef } from 'react';
import { FormattedText } from '../components/FormattedText';
import { Listing, PropertyType, PhotoItem, UserProfile } from '../types/listing';
import { CASHBACK_LENDER_NOTICE, CASHBACK_SELLER_OFFER_NOTICE, CONTRACT_NOTICE } from '../lib/legalText';
import { db, TERMS_VERSION } from '../lib/db';
import { coachListing, measureDarkPhotos } from '../lib/listingCoach';
import { geocodeAddress } from '../lib/geocode';
import { OPEN_PROVINCES, CLOSED_PROVINCES, QUEBEC_COMING_SOON, postalInClosedProvince, citiesInProvince, provinceName } from '../data/cities';
import { validateImageFile, processAndResizeImage } from '../lib/imageUtils';
import { calculateBCCommission, commissionTax, formatCAD, LISTING_FEE_LABEL } from '../lib/commissionCalc';
import { AGENT_FIXED_RANGE, AGENT_OFFER_NOTICE, AGENT_PERCENT_RANGE, describeAgentCommission, validateAgentOffer, type AgentCommissionType } from '../lib/agentCommission';
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
import { sanitizeHtml, stripHtml, stripHtmlKeepLines, validateCanadianPostalCode } from '../lib/security';
import { isGuestUser } from '../lib/db';
import { loadDraftPhotos, saveDraftPhotos } from '../lib/draftPhotos';
import { trackEvent } from '../lib/analytics';
import { ListingDetailPage } from './ListingDetailPage';
interface WizardPageProps {
  activeUser: UserProfile;
  onListingCreated: () => void;
  onCancel: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup', opts?: { title?: string; subtitle?: string }) => void;
  /** An existing listing to edit. When absent, the wizard always creates a NEW listing. */
  editListing?: Listing | null;
}

const STEPS = [
  { id: 1, title: 'Address and type', subtitle: 'Where is your home located?' },
  { id: 2, title: 'Details and price', subtitle: 'Size, rooms and asking price' },
  { id: 3, title: 'Photos', subtitle: 'Upload clear photos (resized on your device)' },
  { id: 4, title: 'Description', subtitle: 'What makes your home special?' },
  { id: 5, title: 'Buyers and agents', subtitle: 'Optional: cash back for the buyer, and whether agents are welcome' },
  { id: 6, title: 'Review and submit', subtitle: 'Confirm and send your listing for review' }
];


export const WizardPage: React.FC<WizardPageProps> = ({
  activeUser,
  onListingCreated,
  onCancel,
  editListing,
  onOpenAuth
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaved, setLastSaved] = useState<string>('Just now');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadingProgress, setUploadingProgress] = useState<Record<string, number>>({});
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ streetAddress: string; city: string; price: number; offersCashback: boolean; cashbackAmount: number; photoCount: number; outcome: 'new' | 'rereview' | 'updated' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoKey, setGeoKey] = useState('');
  // One id for this listing for the whole session, so a retry never creates a duplicate
  const listingIdRef = useRef<string>(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '');
  const [termsAccepted, setTermsAccepted] = useState(false);
  // Listing coach: how many photos look dark (measured when the seller reaches the review step)
  const [darkPhotos, setDarkPhotos] = useState(0);

  // Form State
  const [streetAddress, setStreetAddress] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
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
  // "Agents welcome": the seller's own buyer's agent commission offer
  const [agentsWelcome, setAgentsWelcome] = useState(false);
  const [agentCommissionType, setAgentCommissionType] = useState<AgentCommissionType>('negotiable');
  const [agentCommissionValue, setAgentCommissionValue] = useState<number | ''>('');


  // Restore an unfinished draft (or a listing opened with "Edit") saved on this device
  const [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    // Editing: load that listing directly. New listing: use the device draft, but never
    // one that points at an existing listing (that would overwrite it).
    let draft: Record<string, any> | null = editListing ? (editListing as unknown as Record<string, any>) : db.getDraft();
    if (!editListing && draft?.id) {
      db.clearDraft();
      draft = null;
    }
    if (!draft) return;
    if (draft.id) {
      setEditingId(draft.id);
      listingIdRef.current = draft.id;
    }
    if (draft.streetAddress) setStreetAddress(draft.streetAddress);
    if (draft.unitNumber) setUnitNumber(draft.unitNumber);
    if (draft.city) setCity(draft.city);
    if (draft.province) {
      // A draft for a province that isn't open yet (Quebec) starts with no province chosen
      if (!CLOSED_PROVINCES.includes(draft.province)) setProvince(draft.province);
    } else if (draft.city) {
      setProvince('BC'); // drafts saved before Canada-wide listings were BC-only
    }
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
    if (typeof draft.agentsWelcome === 'boolean') setAgentsWelcome(draft.agentsWelcome);
    if (draft.agentCommissionType) setAgentCommissionType(draft.agentCommissionType);
    if (draft.agentCommissionValue) setAgentCommissionValue(Number(draft.agentCommissionValue));
    // Only photos that are already uploaded come back; new photos are not stored on the device
    if (Array.isArray(draft.photos)) {
      setPhotos(draft.photos.filter((p: PhotoItem) => typeof p.url === 'string' && p.url.startsWith('http')));
    }
  }, []);

  // New listings: bring back photos kept on this device (they survive a reload or signing up)
  const photosRestored = useRef(false);
  useEffect(() => {
    if (editListing) {
      photosRestored.current = true;
      return;
    }
    let cancelled = false;
    // Just signed up or in: the photos may still be under the signed-out key for a moment
    loadDraftPhotos(db.draftPhotosKey())
      .then((saved) => (saved.length || isGuestUser(activeUser) ? saved : loadDraftPhotos(db.guestDraftPhotosKey())))
      .then((saved) => {
      if (cancelled) return;
      if (saved.length) setPhotos((cur) => (cur.length ? cur : saved));
      photosRestored.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [editListing?.id]);

  // ...and keep them up to date while the seller works
  useEffect(() => {
    if (editListing || isSubmittedSuccess || !photosRestored.current) return;
    const t = setTimeout(() => void saveDraftPhotos(db.draftPhotosKey(), photos), 800);
    return () => clearTimeout(t);
  }, [photos, editListing?.id, isSubmittedSuccess, activeUser.id]);

  // Analytics: someone started (or reopened) the listing form
  useEffect(() => {
    if (!editListing) trackEvent('start_listing', { signed_in: !isGuestUser(activeUser) });
  }, []);

  const isGuest = isGuestUser(activeUser);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Autosave text fields on this device (photos are kept on the device separately, above)
  useEffect(() => {
    if (isSubmittedSuccess) return;
    if (editingId) return; // edits are not autosaved into the new-listing draft
    const timer = setTimeout(() => {
      db.saveDraft({
        id: editingId ?? undefined,
        streetAddress,
        unitNumber,
        city,
        province,
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
        agentsWelcome,
        agentCommissionType,
        agentCommissionValue
      });
      setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 600);

    return () => clearTimeout(timer);
  }, [
    streetAddress, unitNumber, city, province, postalCode, neighborhood, propertyType, lat, lng,
    price, bedrooms, bathrooms, sqft, lotSqft, lotAcres, yearBuilt, parkingSpaces, strataFee, propertyTaxesAnnual,
    headline, description, neighborhoodHighlights, upgradesInput, inclusionsInput, photos,
    offersCashback, cashbackType, cashbackAmount, agentsWelcome, agentCommissionType, agentCommissionValue, editingId, isSubmittedSuccess
  ]);

  // Live Commission calculations
  const commissionBreakdown = calculateBCCommission(price, offersCashback, cashbackType, cashbackAmount, province || undefined);

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

  useEffect(() => {
    if (currentStep !== 6 || photos.length === 0) return;
    let cancelled = false;
    measureDarkPhotos(photos).then((n) => {
      if (!cancelled) setDarkPhotos(n);
    });
    return () => {
      cancelled = true;
    };
  }, [currentStep, photos]);

  const coachTips = coachListing({
    propertyType,
    sqft,
    yearBuilt,
    lotSqft,
    lotAcres,
    strataFee,
    propertyTaxesAnnual,
    photos,
    headline,
    description,
    neighborhoodHighlights,
    upgrades: upgradesInput,
    inclusions: inclusionsInput,
    darkPhotos,
  });

  // Step Navigation Validation
  const handleNext = async () => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!streetAddress.trim()) {
        setValidationError('Please enter your street address.');
        return;
      }
      if (!city.trim()) {
        setValidationError('Please enter your city or town.');
        return;
      }
      if (!province) {
        setValidationError('Please choose your province or territory.');
        return;
      }
      if (CLOSED_PROVINCES.includes(province as any) || postalInClosedProvince(postalCode)) {
        setValidationError(QUEBEC_COMING_SOON);
        return;
      }
      if (!validateCanadianPostalCode(postalCode).valid) {
        setValidationError('Please enter a valid Canadian postal code (e.g. V2Y 3K9).');
        return;
      }
      if (!validateCanadianPostalCode(postalCode, province).valid) {
        setValidationError(`That postal code doesn’t match ${provinceName(province)}. Please check the province or the postal code.`);
        return;
      }
      if (!neighborhood.trim()) {
        setValidationError('Please enter your neighbourhood name (shown publicly instead of your street address).');
        return;
      }
      // Place the home on the map. Falls back to the city centre if the lookup is unavailable.
      const key = `${streetAddress.trim()}|${city.trim()}|${province}|${postalCode.trim()}`;
      if (geoKey !== key) {
        setLocating(true);
        const g = await geocodeAddress(streetAddress.trim(), city.trim(), province, postalCode.trim());
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

    if (currentStep === 5) {
      const agentError = validateAgentOffer({ agentsWelcome, agentCommissionType, agentCommissionValue: Number(agentCommissionValue) || undefined });
      if (agentError) {
        setValidationError(agentError);
        return;
      }
    }

    if (currentStep < 6) {
      trackEvent('listing_step', { step: currentStep + 1 });
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  // What buyers will see, built from the form (never saved; used by "Preview your listing")
  const buildPreviewListing = (): Listing => ({
    id: 'preview',
    userId: activeUser.id,
    sellerName: activeUser.name || 'The owner',
    sellerEmail: '',
    sellerPhone: '',
    status: 'live',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    city,
    province,
    neighborhood: neighborhood || city,
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
    cashbackAmount: offersCashback ? commissionBreakdown.offeredCashback : 0,
    estimatedCommissionSaved: commissionBreakdown.traditionalTotalCommission,
    agentsWelcome,
    agentCommissionType: agentsWelcome ? agentCommissionType : undefined,
    agentCommissionValue: agentsWelcome && agentCommissionType !== 'negotiable' ? Number(agentCommissionValue) || undefined : undefined,
    photos: [...photos].sort((a, b) => Number(b.isCover) - Number(a.isCover)),
    headline: headline || 'Your headline',
    description: stripHtmlKeepLines(description),
    neighborhoodHighlights: neighborhoodHighlights ? stripHtmlKeepLines(neighborhoodHighlights) : undefined,
    recentUpgrades: upgradesInput.split(',').map((x) => x.trim()).filter(Boolean),
    inclusions: inclusionsInput.split(',').map((x) => x.trim()).filter(Boolean),
    viewsCount: 0,
    savesCount: 0,
    inquiriesCount: 0,
  });

  const openPreview = () => {
    trackEvent('preview_listing', { signed_in: !isGuest });
    setPreviewOpen(true);
  };

  const askToSignUp = () => {
    trackEvent('signup_prompt', { from: 'listing_form' });
    onOpenAuth?.('signup', {
      title: 'Create your free account to submit',
      subtitle:
        'Your listing and photos are saved on this device. After you confirm your email, you’ll come back here to submit it for review.',
    });
  };

  // Final submit: saves everything to the database and sends the listing to the review queue
  const handleFinalSubmit = async () => {
    if (submitting) return;
    if (isGuest) {
      askToSignUp();
      return;
    }
    if (!termsAccepted) {
      setValidationError('Please accept the OwnersMarket Terms of Use and Privacy Policy to submit your listing.');
      return;
    }

    const { formatted: formattedPostal } = validateCanadianPostalCode(postalCode, province);
    const upgradesList = upgradesInput.split(',').map((x) => stripHtml(x.trim())).filter(Boolean);
    const inclusionsList = inclusionsInput.split(',').map((x) => stripHtml(x.trim())).filter(Boolean);
    const finalCashback = offersCashback ? commissionBreakdown.offeredCashback : 0;

    setSubmitting(true);
    setValidationError(null);
    try {
      const submission = {
        id: listingIdRef.current || undefined,
        streetAddress: stripHtml(streetAddress),
        unitNumber: unitNumber ? stripHtml(unitNumber) : undefined,
        postalCode: formattedPostal,
        city: stripHtml(city.trim()),
        province,
        neighborhood: stripHtml(neighborhood) || stripHtml(city.trim()),
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
        agentsWelcome,
        agentCommissionType: agentsWelcome ? agentCommissionType : undefined,
        agentCommissionValue: agentsWelcome && agentCommissionType !== 'negotiable' ? Number(agentCommissionValue) : undefined,
        headline: stripHtml(headline),
        description: stripHtmlKeepLines(description),
        neighborhoodHighlights: neighborhoodHighlights ? stripHtmlKeepLines(neighborhoodHighlights) : undefined,
        recentUpgrades: upgradesList,
        inclusions: inclusionsList,
        photos,
      };
      const wasApproved = !!editingId && ['live', 'paused'].includes(db.getListingById(editingId)?.status ?? '');
      const needsReview = db.editNeedsReview(submission);
      await db.saveListing(submission);
      if (!editingId) db.clearDraft(); // keep any unfinished new-listing draft when saving an edit
      setSubmittedSummary({
        streetAddress: stripHtml(streetAddress),
        city,
        price,
        offersCashback,
        cashbackAmount: finalCashback,
        photoCount: photos.length,
        outcome: !wasApproved ? 'new' : needsReview ? 'rereview' : 'updated',
      });
      setIsSubmittedSuccess(true);
      trackEvent(!wasApproved ? 'submit_listing' : 'update_listing', { photos: photos.length });
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
            {submittedSummary.outcome === 'updated'
              ? 'Your changes are live'
              : submittedSummary.outcome === 'rereview'
                ? 'Your changes are in review'
                : 'Your Listing is in Review!'}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
            {submittedSummary.outcome === 'updated' ? (
              <>Your listing for <strong>{submittedSummary.streetAddress}, {submittedSummary.city}</strong> has been updated.</>
            ) : submittedSummary.outcome === 'rereview' ? (
              <>You changed the words, photos or address of <strong>{submittedSummary.streetAddress}, {submittedSummary.city}</strong>, so our team will give them a quick review (usually within 1 business day). Your listing stays live as it was until then, and your new version replaces it once it’s approved. Your subscription isn’t affected.</>
            ) : (
              <>We’ve received your listing for <strong>{submittedSummary.streetAddress}, {submittedSummary.city}</strong>. Our team will give it a quick review (usually within 1 business day). Once approved, tap "Activate listing" in your dashboard to publish it.</>
            )}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3">
          <div className="text-xs font-semibold text-slate-400">
            Listing summary
          </div>
          <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
            <span className="text-slate-600">Asking price</span>
            <span className="font-bold text-slate-900 tabular-nums">{formatCAD(submittedSummary.price)}</span>
          </div>
          {submittedSummary.offersCashback && (
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-600">Buyer cash back</span>
              <span className="font-bold text-emerald-800 tabular-nums">+{formatCAD(submittedSummary.cashbackAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm py-1">
            <span className="text-slate-600">Photos uploaded</span>
            <span className="font-medium text-slate-800 tabular-nums">{submittedSummary.photoCount} photos</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => onListingCreated()}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all shadow-sm min-h-[44px]"
          >
            Go to my dashboard
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
          <span className="font-semibold text-emerald-800">
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
                Street address
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="wizard-unit-number" className="block text-xs font-semibold text-slate-700 mb-1">Unit / suite # (optional)</label>
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
                <label htmlFor="wizard-city-input" className="block text-xs font-semibold text-slate-700 mb-1">City or town</label>
                <input
                  id="wizard-city-input"
                  type="text"
                  list="wizard-city-suggestions"
                  autoComplete="address-level2"
                  placeholder="e.g. Langley, Ottawa, Halifax"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                />
                <datalist id="wizard-city-suggestions">
                  {citiesInProvince(province).map((c) => (
                    <option key={c.name} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="wizard-province-select" className="block text-xs font-semibold text-slate-700 mb-1">Province or territory</label>
                <select
                  id="wizard-province-select"
                  value={province}
                  autoComplete="address-level1"
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
                >
                  <option value="">Choose…</option>
                  {OPEN_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">{QUEBEC_COMING_SOON}</p>
              </div>

              <div>
                <label htmlFor="wizard-postal-code" className="block text-xs font-semibold text-slate-700 mb-1">Postal code</label>
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
                Neighbourhood name
              </label>
              <input
                id="wizard-neighborhood"
                type="text"
                placeholder="e.g. Willoughby, The Glebe, Clayton Park"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm min-h-[44px]"
              />
            </div>

            {/* Property Type Radio Cards */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Property type
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
                  Asking price ($ CAD)
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
                <label htmlFor="wizard-interior-sqft" className="block text-xs font-semibold text-slate-700 mb-1">Interior area (sq ft)</label>
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
                <label htmlFor="wizard-lot-sqft" className="block text-xs font-semibold text-slate-700 mb-1">Lot size (sq ft)</label>
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
                <label htmlFor="wizard-year-built" className="block text-xs font-semibold text-slate-700 mb-1">Year built</label>
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
                <label htmlFor="wizard-parking-spaces" className="block text-xs font-semibold text-slate-700 mb-1">Parking spaces</label>
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
                <label htmlFor="wizard-annual-taxes" className="block text-xs font-semibold text-slate-700 mb-1">Annual taxes ($ CAD)</label>
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
                  <label htmlFor="wizard-strata-fee" className="block text-xs font-semibold text-slate-700 mb-1">Monthly strata ($)</label>
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
                <span>Photos are resized automatically</span>
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
                  Choose photos from your phone or computer
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
                          Set cover
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
                Listing headline
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
                Full description
              </label>
              <p id="wizard-description-tip" className="text-xs text-slate-500 mb-2">
                Leave a blank line between paragraphs. Start a line with a dash (-) to make a bulleted list, for example for room sizes.
              </p>
              <textarea
                id="wizard-full-description"
                rows={10}
                aria-describedby="wizard-description-tip"
                placeholder={'Describe your home, living spaces, sunlight, outdoor living, and why you loved living here.\n\nMain floor:\n- Living room: 16 × 14 ft\n- Kitchen: 12 × 11 ft'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm leading-relaxed resize-y min-h-[220px]"
              />
              {/\n|^\s*[-*•]\s/m.test(description) && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-emerald-700 font-semibold">Preview how buyers will see it</summary>
                  <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl">
                    <FormattedText text={description} className="text-[15px] text-slate-800 leading-relaxed break-words" />
                  </div>
                </details>
              )}
            </div>

            {/* Prompt helpers */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label htmlFor="wizard-recent-upgrades" className="block text-xs font-semibold text-slate-700 mb-1">
                  Recent upgrades (comma separated)
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
                <label htmlFor="wizard-inclusions" className="block text-xs font-semibold text-slate-700 mb-1">
                  Inclusions (what stays with the home?)
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
                <label htmlFor="wizard-neighborhood-highlights" className="block text-xs font-semibold text-slate-700 mb-1">
                  Neighbourhood and school notes
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
                <span>Optional: offer a buyer cash back</span>
              </div>
              <p className="text-xs text-emerald-950/90 leading-relaxed">
                At an example commission rate (7% on the first $100k + 2.5% on the balance + {commissionTax(province).label}; commissions are negotiable), a brokerage commission on your {formatCAD(price)} home would be an estimated <strong>{formatCAD(commissionBreakdown.traditionalTotalCommission)}</strong>. OwnersMarket charges no commission, just a flat $24.99/month per active listing. You may choose to offer part of what you could save as a cash-back to your buyer. This estimate assumes no real estate agent is involved. If your buyer uses an agent, that agent may ask you to pay their commission, which would reduce your savings.
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">Offer buyer cash back at completion?</div>
                <div className="text-xs text-slate-500">Your voluntary offer, written into the purchase contract by the parties' lawyers or notaries</div>
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
                  <span className="text-xs font-semibold text-slate-700">
                    Cash back amount
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
                    <div className="text-slate-400">Buyer receives:</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
                      {formatCAD(cashbackAmount)} credit
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-100/60 rounded-xl border border-emerald-200">
                    <div className="text-emerald-800 font-medium">You could still keep (estimate):</div>
                    <div className="text-base font-bold text-emerald-900 mt-0.5 tabular-nums">
                      {formatCAD(commissionBreakdown.netSellerSavingsWithCashback)}
                    </div>
                    <div className="text-[10px] text-emerald-800/80">before $24.99/month listing fees</div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                  <div className="font-semibold text-slate-800">Important:</div>
                  <p>{CASHBACK_SELLER_OFFER_NOTICE}</p>
                  <p>{CONTRACT_NOTICE}</p>
                  <p className="font-medium text-slate-800">{CASHBACK_LENDER_NOTICE}</p>
                </div>
              </div>
            )}

            {/* Agents welcome */}
            <div className="pt-4 border-t border-slate-200 space-y-4">
              <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label htmlFor="wizard-agents-welcome" className="cursor-pointer">
                  <div className="text-sm font-bold text-slate-900">Agents welcome: pay a buyer's agent commission?</div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Many buyers work with a real estate agent. Tick this to show agents that you'll pay their commission if their client buys
                    your home. Your listing gets an "Agents welcome" badge, and agents can find it with a filter.
                  </div>
                </label>
                <input
                  id="wizard-agents-welcome"
                  type="checkbox"
                  checked={agentsWelcome}
                  onChange={(e) => setAgentsWelcome(e.target.checked)}
                  className="w-5 h-5 accent-emerald-700 rounded cursor-pointer mt-1 shrink-0"
                />
              </div>

              {agentsWelcome && (
                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold text-slate-700 mb-1">Commission you would pay the buyer's agent's brokerage</legend>
                    {([
                      ['percent', 'A percentage of the sale price'],
                      ['fixed', 'A fixed amount'],
                      ['negotiable', 'To be negotiated with the agent'],
                    ] as [AgentCommissionType, string][]).map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="agent-commission-type"
                          value={value}
                          checked={agentCommissionType === value}
                          onChange={() => setAgentCommissionType(value)}
                          className="accent-emerald-700"
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>

                  {agentCommissionType !== 'negotiable' && (
                    <label className="block">
                      <span className="block text-xs font-semibold text-slate-700 mb-1">
                        {agentCommissionType === 'percent' ? 'Percentage of the sale price (%)' : 'Amount ($ CAD)'}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={agentCommissionType === 'percent' ? AGENT_PERCENT_RANGE.min : AGENT_FIXED_RANGE.min}
                        max={agentCommissionType === 'percent' ? AGENT_PERCENT_RANGE.max : AGENT_FIXED_RANGE.max}
                        step={agentCommissionType === 'percent' ? 0.25 : 500}
                        value={agentCommissionValue}
                        onChange={(e) => setAgentCommissionValue(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full sm:w-56 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
                      />
                      {agentCommissionType === 'percent' && Number(agentCommissionValue) > 0 && (
                        <span className="block text-xs text-slate-500 mt-1">
                          About {formatCAD((price * Number(agentCommissionValue)) / 100)} on your asking price, plus GST/HST if it applies.
                        </span>
                      )}
                    </label>
                  )}

                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                    <div className="font-semibold text-slate-800">Good to know:</div>
                    <p>{AGENT_OFFER_NOTICE}</p>
                    <p>
                      The amount is your choice and is negotiable; there is no standard rate. Paying a buyer's agent reduces what you keep, and
                      you can still sell to buyers who don't have an agent. Before you sign anything with a brokerage, have your lawyer or notary
                      look at it.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------- STEP 6: Review & Submit ---------------- */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{headline}</h3>
                  <div className="text-xs text-slate-500">{streetAddress}, {city}, {province}</div>
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

              {agentsWelcome && (
                <div className="bg-white p-3 rounded-xl text-xs text-slate-800 border border-slate-200 flex items-center justify-between gap-3">
                  <span>Agents welcome. Buyer's agent commission:</span>
                  <span className="font-bold text-slate-900 text-right">{describeAgentCommission({ agentsWelcome, agentCommissionType, agentCommissionValue: Number(agentCommissionValue) || undefined })}</span>
                </div>
              )}
              {offersCashback && (
                <div className="bg-emerald-100/70 p-3 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                  <span>Buyer cash back incentive offered:</span>
                  <span className="font-bold text-emerald-900 tabular-nums">+{formatCAD(cashbackAmount)}</span>
                </div>
              )}
            </div>

            {/* Listing coach: tips before submitting (never about price) */}
            {coachTips.length > 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 space-y-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Tips to get more viewing requests</div>
                  <p className="text-xs text-slate-600 mt-0.5">Optional. You can submit now and improve your listing any time with Edit.</p>
                </div>
                <ul className="space-y-2">
                  {coachTips.map((tip) => (
                    <li key={tip.id} className="flex items-start gap-3 text-xs text-slate-800 leading-relaxed">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold  ${
                          tip.level === 'important' ? 'bg-amber-200 text-amber-950' : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {tip.level === 'important' ? 'Buyers ask' : 'Tip'}
                      </span>
                      <span className="flex-1">{tip.text}</span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(tip.step)}
                        className="shrink-0 font-semibold text-emerald-800 underline underline-offset-2 hover:text-slate-900 cursor-pointer min-h-[32px]"
                      >
                        Fix
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 font-semibold">
                Your listing looks complete. Nice work.
              </div>
            )}

            {editListing?.pendingEdit?.status === 'rejected' && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed">
                <strong>Our note on your changes:</strong> {editListing.pendingEdit.reviewNotes || 'Please review your changes and save them again.'}
              </div>
            )}

            {editListing && ['live', 'paused'].includes(editListing.status) && !editListing.adminHold && (
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed">
                <strong>Editing an approved listing.</strong> Changes to the headline, description, photos or address get a quick review (usually within 1 business day). Your listing stays live as it is meanwhile, and the new version replaces it once approved. Changes to the price and home details (rooms, size, fees, cash-back) go live right away.
              </div>
            )}

            {/* See it the way buyers will */}
            <button
              type="button"
              onClick={openPreview}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-white border-[1.5px] border-slate-900 hover:bg-slate-50 text-slate-900 font-semibold text-sm rounded-xl min-h-[48px] cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              Preview your listing as buyers will see it
            </button>

            {isGuest && (
              <div className="rounded-xl border-2 border-emerald-700 bg-emerald-50 p-5 space-y-3">
                <div className="font-bold text-slate-900 text-base">Last step: create your free account</div>
                <ul className="text-sm text-slate-700 space-y-1.5 list-disc pl-5">
                  <li>Your listing and photos are saved on this device, so nothing is lost.</li>
                  <li>We’ll email you a link to confirm your address. It brings you back here to submit.</li>
                  <li>
                    After a quick review (usually within a day), you activate your listing on the {LISTING_FEE_LABEL}/month plan. No commission,
                    cancel any time.
                  </li>
                </ul>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    onClick={askToSignUp}
                    className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl min-h-[48px] cursor-pointer"
                  >
                    Create free account
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth?.('signin', { title: 'Sign in to submit your listing' })}
                    className="px-5 py-3 text-sm font-semibold text-slate-800 underline underline-offset-2 min-h-[48px] cursor-pointer"
                  >
                    I already have an account
                  </button>
                </div>
              </div>
            )}

            {/* Legal Confirmation & Mandatory Terms Acceptance */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Your declaration</span>
              </div>
              <p className="text-slate-600">
                You confirm that you are the owner of this property or are legally authorized by the owner to advertise it for sale, that all information and photos are accurate, and that you are solely responsible for this listing. OwnersMarket does not verify property ownership, is an advertising marketplace only, and is not a licensed real estate brokerage.
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
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-800 font-bold underline">Terms of use</a>
                  <span className="font-semibold text-slate-900"> and </span>
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-800 font-bold underline">Privacy policy</a>.
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

          {currentStep < 6 ? (
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
              <span>{submitting ? 'Uploading… please keep this page open' : isGuest ? 'Create account to submit' : editListing && ['live', 'paused'].includes(editListing.status) ? 'Save changes' : 'Submit listing for review'}</span>
            </button>
          )}
        </div>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[70] bg-white overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Preview of your listing"
          onKeyDown={(e) => e.key === 'Escape' && setPreviewOpen(false)}
        >
          <ListingDetailPage
            listing={buildPreviewListing()}
            activeUser={activeUser}
            isFavorited={false}
            onToggleFavorite={() => {}}
            onBack={() => setPreviewOpen(false)}
            previewMode
          />
        </div>
      )}
    </div>
  );
};
