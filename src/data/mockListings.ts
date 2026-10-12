import { Listing } from '../types/listing';

// Real generated high-resolution assets for Lower Mainland / Fraser Valley
export const CRAFTSMAN_LANGLEY = '/src/assets/images/listing_craftsman_langley_1791616879156.jpg';
export const TOWNHOUSE_BURNABY = '/src/assets/images/listing_townhouse_burnaby_1791616894398.jpg';
export const FARMHOUSE_ABBOTSFORD = '/src/assets/images/listing_farmhouse_abbotsford_1791616906317.jpg';
export const CONTEMPORARY_KITS = '/src/assets/images/listing_contemporary_kits_1791616921752.jpg';
export const INTERIOR_LIVING = '/src/assets/images/listing_interior_living_1791616935215.jpg';
export const COQUITLAM_BURKE = '/src/assets/images/listing_coquitlam_home_1791699901044.jpg';
export const RICHMOND_STEVESTON = '/src/assets/images/listing_richmond_townhome_1791699914792.jpg';
export const WHITEROCK_OCEAN = '/src/assets/images/listing_whiterock_view_1791699929612.jpg';
export const CHILLIWACK_PROMONTORY = '/src/assets/images/listing_chilliwack_craftsman_1791699943961.jpg';

export const INITIAL_LISTINGS: Listing[] = [
  // 1. Langley (Willoughby Heights) - Craftsman Detached
  {
    id: 'dh-langley-20876',
    userId: 'user-seller-sarah',
    sellerName: 'Sarah & David Miller',
    sellerEmail: 'sarah.miller@directhome.ca',
    sellerPhone: '604-555-0142',
    status: 'live',
    createdAt: '2026-09-28T14:20:00Z',
    updatedAt: '2026-10-05T09:15:00Z',
    streetAddress: '20876 77A Avenue',
    city: 'Langley',
    province: 'BC',
    postalCode: 'V2Y 3K9',
    neighborhood: 'Willoughby Heights',
    lat: 49.1432,
    lng: -122.6582,
    propertyType: 'Single Family Detached',
    price: 1299000,
    bedrooms: 4,
    bathrooms: 3.5,
    sqft: 2850,
    lotSqft: 4500,
    yearBuilt: 2018,
    parkingSpaces: 2,
    propertyTaxesAnnual: 5420,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 15000,
    estimatedCommissionSaved: 38824,
    headline: 'Custom Pacific Northwest Craftsman in Willoughby Heights',
    description: 'Welcome to this meticulously maintained craftsman family home built in 2018. Features custom cedar beam entry, wide-plank European oak flooring, high-efficiency heat pump with A/C, and an entertainer’s quartz island kitchen. The south-facing landscaped backyard is fully fenced with covered patio gas BBQ hookups. Walking distance to Peter Ewart Middle School and Yorkson Community Park.',
    neighborhoodHighlights: 'Quiet family-friendly street with minimal pass-through traffic. 4 minutes to Carvolth Transit Exchange (rapid bus to SkyTrain), 6 minutes to Highway 1.',
    recentUpgrades: [
      'New high-efficiency heat pump with central air conditioning (2023)',
      'Custom built-in mudroom cabinetry and pantry pullouts',
      'Level 2 240V EV charger installed in garage',
      'In-ground multi-zone irrigation system'
    ],
    inclusions: [
      'Bosch stainless induction range & dishwasher',
      'LG smart washer & dryer',
      'All custom window coverings and blackout blinds',
      'Cedar garden storage shed'
    ],
    photos: [
      {
        id: 'p1',
        url: CRAFTSMAN_LANGLEY,
        thumbnailUrl: CRAFTSMAN_LANGLEY,
        caption: 'Front exterior at dusk with architectural lighting',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p2',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Open concept great room with vaulted ceilings and cedar beam',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-101',
      fileName: '2026_Langley_Property_Tax_Notice_20876_77A.pdf',
      fileSize: '1.2 MB',
      uploadedAt: '2026-09-28T14:10:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 482,
    savesCount: 38,
    inquiriesCount: 9
  },

  // 2. Burnaby (Burnaby Mountain) - Contemporary Townhome
  {
    id: 'dh-burnaby-8888',
    userId: 'user-seller-marcus',
    sellerName: 'Marcus & Elena Chen',
    sellerEmail: 'marcus.chen@directhome.ca',
    sellerPhone: '604-555-0199',
    status: 'live',
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-08T11:20:00Z',
    streetAddress: '8888 University High Street',
    unitNumber: '103',
    city: 'Burnaby',
    province: 'BC',
    postalCode: 'V5A 4Y6',
    neighborhood: 'UniverCity / Burnaby Mountain',
    lat: 49.2785,
    lng: -122.9199,
    propertyType: 'Townhouse',
    price: 899000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1480,
    yearBuilt: 2021,
    parkingSpaces: 2,
    strataFee: 395,
    propertyTaxesAnnual: 3100,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 10000,
    estimatedCommissionSaved: 28324,
    headline: 'Contemporary West Coast Townhome near Burnaby Mountain Trails',
    description: 'Architecturally designed concrete and timber modern townhouse with private ground-level garden patio. Floor-to-ceiling double-glazed windows bringing in abundant natural light. Custom millwork, Caesarstone countertops, and integrated Fisher & Paykel appliances. Steps away from SFU campus amenities, grocers, and world-class hiking and biking trails.',
    neighborhoodHighlights: 'Quiet forest setting surrounded by protected greenbelt. 2-minute walk to University Highlands Elementary, bus hub connecting to Production Way SkyTrain.',
    recentUpgrades: [
      'Engineered white oak herringbone feature wall in primary suite',
      'Smart Lutron Caseta wireless dimmers throughout',
      'Custom California Closets organizers in all 3 bedrooms'
    ],
    inclusions: [
      'Fisher & Paykel panel-ready refrigerator & gas range',
      'Whirlpool stackable front-load laundry',
      'Private EV ready tandem parking stall'
    ],
    photos: [
      {
        id: 'p3',
        url: TOWNHOUSE_BURNABY,
        thumbnailUrl: TOWNHOUSE_BURNABY,
        caption: 'Contemporary West Coast exterior with private garden entrance',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p4',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Main floor living space with seamless indoor-outdoor connection',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-102',
      fileName: 'Burnaby_Title_Search_Strata_Lot_14.pdf',
      fileSize: '840 KB',
      uploadedAt: '2026-10-02T09:45:00Z',
      documentType: 'land_title_search',
      status: 'verified'
    },
    viewsCount: 314,
    savesCount: 29,
    inquiriesCount: 6
  },

  // 3. Abbotsford (Sumas Prairie Foothills) - Modern Farmhouse on Acreage
  {
    id: 'dh-abbotsford-33244',
    userId: 'user-seller-robert',
    sellerName: 'Robert & Clara Friesen',
    sellerEmail: 'rfriesen@directhome.ca',
    sellerPhone: '604-555-0181',
    status: 'live',
    createdAt: '2026-09-20T16:30:00Z',
    updatedAt: '2026-10-06T14:40:00Z',
    streetAddress: '33244 Old Yale Road',
    city: 'Abbotsford',
    province: 'BC',
    postalCode: 'V2S 2J5',
    neighborhood: 'Sumas Prairie Foothills',
    lat: 49.0499,
    lng: -122.2858,
    propertyType: 'Acreage / Farm',
    price: 1850000,
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3920,
    lotAcres: 2.1,
    yearBuilt: 2020,
    parkingSpaces: 4,
    propertyTaxesAnnual: 4890,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 25000,
    estimatedCommissionSaved: 53288,
    headline: 'Modern Farmhouse on 2.1 Acres with Unobstructed Mt. Baker Views',
    description: 'An exceptional custom residence delivering rural tranquility with modern luxury. Striking white board and batten exterior with standing seam metal roof and wraparound porch. Vaulted 18-foot great room with timber trusses, wood-burning stone fireplace, and panoramic southern views of Mount Baker. Separate heated 30x40 workshop ready for equipment, hobbies, or studio.',
    neighborhoodHighlights: 'Paved road access, city water connection, and natural gas. 10 minutes to Abbotsford International Airport and Hwy 1.',
    recentUpgrades: [
      'Detached 1,200 sqft insulated & heated workshop with 200A sub-panel',
      'Whole-home backup generator with automatic transfer switch',
      'Deep perimeter drainage and paved turnaround driveway'
    ],
    inclusions: [
      'Commercial 48" Wolf dual-fuel range and Sub-Zero column fridge',
      'Automatic security gate with remote and keypad entry',
      'High-efficiency heat pump with triple-zone dampers'
    ],
    photos: [
      {
        id: 'p5',
        url: FARMHOUSE_ABBOTSFORD,
        thumbnailUrl: FARMHOUSE_ABBOTSFORD,
        caption: 'Scenic modern farmhouse with mountain backdrop and long driveway',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p6',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Expansive sunlit living room and chef kitchen with timber accents',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-103',
      fileName: 'City_of_Abbotsford_TaxNotice_Roll_93021.pdf',
      fileSize: '1.6 MB',
      uploadedAt: '2026-09-20T16:15:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 620,
    savesCount: 54,
    inquiriesCount: 14
  },

  // 4. Vancouver (Kitsilano) - Contemporary Detached Home
  {
    id: 'dh-vancouver-2645',
    userId: 'user-seller-cam',
    sellerName: 'Cameron & Sophie Taylor',
    sellerEmail: 'cameron.taylor@directhome.ca',
    sellerPhone: '604-555-0112',
    status: 'live',
    createdAt: '2026-10-04T08:15:00Z',
    updatedAt: '2026-10-09T18:00:00Z',
    streetAddress: '2645 Point Grey Road',
    city: 'Vancouver',
    province: 'BC',
    postalCode: 'V6K 1A2',
    neighborhood: 'Kitsilano North of 4th',
    lat: 49.2721,
    lng: -123.1668,
    propertyType: 'Single Family Detached',
    price: 2380000,
    bedrooms: 4,
    bathrooms: 3.5,
    sqft: 2650,
    lotSqft: 3960,
    yearBuilt: 2019,
    parkingSpaces: 2,
    propertyTaxesAnnual: 7850,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 30000,
    estimatedCommissionSaved: 67200,
    headline: 'Architectural West Coast Modern Detached Home in Prime Kitsilano',
    description: 'Rare opportunity north of 4th in prime Kitsilano. Striking West Coast contemporary architecture boasting natural cedar vertical siding, oversized commercial aluminum glazing, and a private rooftop terrace with ocean and mountain vistas. Interior features radiant in-floor heating on all levels, custom walnut millwork, Miele MasterCool kitchen, and a legal garden suite.',
    neighborhoodHighlights: 'Steps from Kits Beach, seaside bike paths, local organic grocers, and 4th Avenue coffee shops. 10 minutes to downtown Vancouver.',
    recentUpgrades: [
      'Comprehensive Control4 smart home automation (shades, audio, climate, security)',
      'Custom rooftop deck with fire table and outdoor kitchen hookup',
      'Dual EV Level 2 chargers in detached 2-car garage'
    ],
    inclusions: [
      'Miele appliance suite including steam oven and wine cooler',
      'Automated motorized roller shades throughout',
      'Sonos architectural in-ceiling speakers'
    ],
    photos: [
      {
        id: 'p7',
        url: CONTEMPORARY_KITS,
        thumbnailUrl: CONTEMPORARY_KITS,
        caption: 'Front exterior architectural portrait with Japanese maple',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p8',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Gourmet open-concept kitchen and dining with wide plank oak',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-104',
      fileName: 'BC_Land_Title_Registry_Search_Vancouver_2645.pdf',
      fileSize: '950 KB',
      uploadedAt: '2026-10-04T07:55:00Z',
      documentType: 'land_title_search',
      status: 'verified'
    },
    viewsCount: 890,
    savesCount: 82,
    inquiriesCount: 19
  },

  // 5. Coquitlam (Burke Mountain) - Executive View Residence
  {
    id: 'dh-coquitlam-3420',
    userId: 'user-seller-danielle',
    sellerName: 'Danielle & Patrick Wong',
    sellerEmail: 'danielle.wong@directhome.ca',
    sellerPhone: '604-555-0177',
    status: 'live',
    createdAt: '2026-10-01T12:00:00Z',
    updatedAt: '2026-10-07T16:30:00Z',
    streetAddress: '3420 Coast Meridian Road',
    city: 'Coquitlam',
    province: 'BC',
    postalCode: 'V3E 3G8',
    neighborhood: 'Burke Mountain Foothills',
    lat: 49.3142,
    lng: -122.7538,
    propertyType: 'Single Family Detached',
    price: 1620000,
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3180,
    lotSqft: 5200,
    yearBuilt: 2022,
    parkingSpaces: 3,
    propertyTaxesAnnual: 6150,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 20000,
    estimatedCommissionSaved: 47250,
    headline: 'Executive View Residence on Burke Mountain with Triple Garage',
    description: 'Immaculate 3-level executive home perched on Burke Mountain with breathtaking valley and mountain vistas. Soaring double-height ceilings in the great room, dramatic black steel fireplace feature, and an open concept chef kitchen with butler’s pantry. Basement includes a high-ceiling legal 1-bedroom suite as a mortgage helper or in-law accommodation.',
    neighborhoodHighlights: 'Walking distance to Smiling Creek Elementary and Queenston Park. 8 minutes to Coquitlam Centre and Evergreen SkyTrain.',
    recentUpgrades: [
      'Finished legal 1-bedroom suite with private exterior entrance',
      'Custom glass-railing sundeck with outdoor gas fireplace',
      'Epoxy floor coating and Proslat wall organization in 3-car garage'
    ],
    inclusions: [
      'JennAir chef series kitchen appliances',
      'Dual hot water on demand tankless systems',
      'Smart security camera system with local NVR storage'
    ],
    photos: [
      {
        id: 'p10',
        url: COQUITLAM_BURKE,
        thumbnailUrl: COQUITLAM_BURKE,
        caption: 'Dramatic evening view of West Coast contemporary architecture against Burke Mountain',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p11',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Sun-drenched main living space with wide oak floors',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-106',
      fileName: 'City_of_Coquitlam_TaxAssessment_2026.pdf',
      fileSize: '1.1 MB',
      uploadedAt: '2026-10-01T11:45:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 520,
    savesCount: 46,
    inquiriesCount: 11
  },

  // 6. Richmond (Steveston) - Waterfront Townhome
  {
    id: 'dh-richmond-12040',
    userId: 'user-seller-hannah',
    sellerName: 'Hannah & Kevin Brooks',
    sellerEmail: 'hannah.brooks@directhome.ca',
    sellerPhone: '604-555-0155',
    status: 'live',
    createdAt: '2026-09-25T11:00:00Z',
    updatedAt: '2026-10-06T15:20:00Z',
    streetAddress: '12040 2nd Avenue',
    unitNumber: '22',
    city: 'Richmond',
    province: 'BC',
    postalCode: 'V7E 4V4',
    neighborhood: 'Steveston Village Waterfront',
    lat: 49.1245,
    lng: -123.1812,
    propertyType: 'Townhouse',
    price: 1050000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1590,
    yearBuilt: 2020,
    parkingSpaces: 2,
    strataFee: 410,
    propertyTaxesAnnual: 3450,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 14000,
    estimatedCommissionSaved: 32288,
    headline: 'Modern Maritime Townhome along Steveston Boardwalk',
    description: 'Live the coastal lifestyle in historic Steveston Village. Steps from the Fraser River boardwalk, fishermen’s wharf, and artisan cafes. This corner-unit townhouse features gabled architectural lines, expansive windows with water glimpses, and a private south-facing patio. Beautiful open-plan layout with European cabinetry and quartz breakfast bar.',
    neighborhoodHighlights: '1-minute walk to Garry Point Park and West Dyke Trail. Top-rated Lord Byng Elementary and McMath Secondary catchment.',
    recentUpgrades: [
      'Custom acoustic insulation upgrade between common strata wall',
      'Built-in banquette seating with hidden storage in dining area',
      'Designer pendant lights over kitchen island'
    ],
    inclusions: [
      'Integrated Bosch appliance package',
      'Full-size front-load washer & dryer',
      'Custom patio planter boxes with drip lines'
    ],
    photos: [
      {
        id: 'p12',
        url: RICHMOND_STEVESTON,
        thumbnailUrl: RICHMOND_STEVESTON,
        caption: 'Steveston waterfront townhomes adjacent to boardwalk and marina',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p13',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Open great room with modern finishes',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-107',
      fileName: 'Richmond_Title_Search_Strata_Unit22.pdf',
      fileSize: '890 KB',
      uploadedAt: '2026-09-25T10:30:00Z',
      documentType: 'land_title_search',
      status: 'verified'
    },
    viewsCount: 412,
    savesCount: 35,
    inquiriesCount: 8
  },

  // 7. White Rock - Ocean View Luxury Detached
  {
    id: 'dh-whiterock-14880',
    userId: 'user-seller-greg',
    sellerName: 'Gregory & Nicole Vance',
    sellerEmail: 'greg.vance@directhome.ca',
    sellerPhone: '604-555-0168',
    status: 'live',
    createdAt: '2026-09-18T09:00:00Z',
    updatedAt: '2026-10-04T12:00:00Z',
    streetAddress: '14880 Marine Drive',
    city: 'White Rock',
    province: 'BC',
    postalCode: 'V4B 1C4',
    neighborhood: 'West Beach Marine Drive Foothills',
    lat: 49.0225,
    lng: -122.8123,
    propertyType: 'Single Family Detached',
    price: 2100000,
    bedrooms: 4,
    bathrooms: 4,
    sqft: 3340,
    lotSqft: 6100,
    yearBuilt: 2021,
    parkingSpaces: 2,
    propertyTaxesAnnual: 7420,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 28000,
    estimatedCommissionSaved: 59850,
    headline: 'Modern Cliffside Sanctuary with Sweeping Pacific Ocean Views',
    description: 'An architectural triumph overlooking Semiahmoo Bay and the Gulf Islands. Floor-to-ceiling glass walls showcase panoramic sunsets and oceanic marine life. Features an infinity-edge dipping pool, expansive outdoor entertaining terraces with glass railings, suspended fireplace, and primary bedroom retreat with freestanding soaking tub framing the ocean.',
    neighborhoodHighlights: 'Steps from White Rock promenade, pier, and seaside dining. 5 minutes to Peace Arch Hospital and US Border crossing.',
    recentUpgrades: [
      'Heated ocean-facing plunge pool with saltwater filtration',
      'Solar energy array offsetting 65% of annual power consumption',
      'Commercial grade exterior motorized wind/sun screens'
    ],
    inclusions: [
      'Sub-Zero refrigerator, 6-burner gas range, dual dishwashers',
      'Whole-home water filtration system',
      'Outdoor built-in Lynx gas grill'
    ],
    photos: [
      {
        id: 'p14',
        url: WHITEROCK_OCEAN,
        thumbnailUrl: WHITEROCK_OCEAN,
        caption: 'Breathtaking ocean view modern residence at sunset with infinity terrace',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p15',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Luxury oceanfront living room with natural light',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-108',
      fileName: 'City_of_White_Rock_Tax_Assessment_2026.pdf',
      fileSize: '1.3 MB',
      uploadedAt: '2026-09-18T08:45:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 745,
    savesCount: 68,
    inquiriesCount: 16
  },

  // 8. Chilliwack (Promontory) - Mountain View Timber Craftsman
  {
    id: 'dh-chilliwack-46210',
    userId: 'user-seller-brad',
    sellerName: 'Bradley & Megan Klassen',
    sellerEmail: 'brad.klassen@directhome.ca',
    sellerPhone: '604-555-0127',
    status: 'live',
    createdAt: '2026-10-03T15:30:00Z',
    updatedAt: '2026-10-08T09:40:00Z',
    streetAddress: '46210 Promontory Road',
    city: 'Chilliwack',
    province: 'BC',
    postalCode: 'V2R 4K8',
    neighborhood: 'Sardis / Promontory Heights',
    lat: 49.1238,
    lng: -121.9542,
    propertyType: 'Single Family Detached',
    price: 849000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2450,
    lotSqft: 6800,
    yearBuilt: 2017,
    parkingSpaces: 2,
    propertyTaxesAnnual: 3620,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 10000,
    estimatedCommissionSaved: 27011,
    headline: 'Timber Craftsman Home with Unrivalled Fraser Valley & Mountain Vistas',
    description: 'Perched on the sunny south-facing slopes of Promontory, this charming timber and river-rock craftsman offers some of the finest mountain views in the Fraser Valley. Vaulted wood ceilings, cozy stone hearth, open layout with butcher-block island, and a walk-out daylight basement suitable for a suite. Expansive covered cedar deck for year-round morning coffees.',
    neighborhoodHighlights: 'Minutes to Promontory Heights Elementary and Jinkerson Park. 12 minutes to Cultus Lake recreation.',
    recentUpgrades: [
      'New composite cedar-tone deck boards and black aluminum spindle railings',
      'Air conditioning heat pump installed in 2023',
      'Fully landscaped terraced rock garden with perennial mountain flora'
    ],
    inclusions: [
      'Samsung black stainless steel kitchen suite',
      'Gas fireplace insert with timber mantel',
      'Outdoor cedar storage shed'
    ],
    photos: [
      {
        id: 'p16',
        url: CHILLIWACK_PROMONTORY,
        thumbnailUrl: CHILLIWACK_PROMONTORY,
        caption: 'Timber craftsman with panoramic views of the Fraser Valley and Mount Cheam',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p17',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Open interior living room with mountain view backdrop',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-109',
      fileName: 'City_of_Chilliwack_TaxNotice_Roll_55219.pdf',
      fileSize: '1.0 MB',
      uploadedAt: '2026-10-03T15:10:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 388,
    savesCount: 33,
    inquiriesCount: 7
  },

  // 9. Surrey (Fleetwood) - Half Duplex Family Home
  {
    id: 'dh-surrey-16280',
    userId: 'user-seller-deepak',
    sellerName: 'Deepak & Sunita Sharma',
    sellerEmail: 'deepak.sharma@directhome.ca',
    sellerPhone: '604-555-0193',
    status: 'live',
    createdAt: '2026-10-05T13:00:00Z',
    updatedAt: '2026-10-09T10:15:00Z',
    streetAddress: '16280 84th Avenue',
    city: 'Surrey',
    province: 'BC',
    postalCode: 'V4N 1B2',
    neighborhood: 'Fleetwood Town Centre',
    lat: 49.1555,
    lng: -122.7688,
    propertyType: 'Duplex / Half-Duplex',
    price: 945000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1760,
    lotSqft: 3400,
    yearBuilt: 2019,
    parkingSpaces: 2,
    propertyTaxesAnnual: 3580,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 12000,
    estimatedCommissionSaved: 29531,
    headline: 'No-Strata Half-Duplex in Growing Fleetwood Community',
    description: 'No strata fees, no restrictions! This immaculate non-strata half-duplex delivers single-family independence at an accessible price. Bright open layout with quartz countertops, laminate flooring throughout, and a private fenced yard with patio perfect for children and pets. Short walking distance to the upcoming Surrey-Langley SkyTrain line.',
    neighborhoodHighlights: 'Walking distance to Fleetwood Park Secondary and Francis Park. 5 minutes to Guildford Town Centre and Rec Centre.',
    recentUpgrades: [
      'Custom stone patio extension with gazebo',
      'EV charger ready in garage',
      'Gas fireplace with quartz tile surround'
    ],
    inclusions: [
      'Whirlpool stainless steel kitchen appliances',
      'Front-loading laundry pair',
      'Security alarm system'
    ],
    photos: [
      {
        id: 'p18',
        url: CRAFTSMAN_LANGLEY,
        thumbnailUrl: CRAFTSMAN_LANGLEY,
        caption: 'Street front of bright craftsman duplex',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p19',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Comfortable family living room',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-110',
      fileName: 'Surrey_TaxNotice_Roll_77201.pdf',
      fileSize: '1.2 MB',
      uploadedAt: '2026-10-05T12:40:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 298,
    savesCount: 24,
    inquiriesCount: 5
  },

  // 10. Maple Ridge (Silver Valley) - Greenbelt Detached Home
  {
    id: 'dh-mapleridge-23100',
    userId: 'user-seller-jason',
    sellerName: 'Jason & Amy Tremblay',
    sellerEmail: 'jason.tremblay@directhome.ca',
    sellerPhone: '604-555-0185',
    status: 'live',
    createdAt: '2026-10-04T14:15:00Z',
    updatedAt: '2026-10-07T11:00:00Z',
    streetAddress: '23100 Fern Crescent',
    city: 'Maple Ridge',
    province: 'BC',
    postalCode: 'V4R 2S5',
    neighborhood: 'Silver Valley / Golden Ears',
    lat: 49.2432,
    lng: -122.5621,
    propertyType: 'Single Family Detached',
    price: 1180000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2610,
    lotSqft: 4800,
    yearBuilt: 2017,
    parkingSpaces: 2,
    propertyTaxesAnnual: 4680,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 15000,
    estimatedCommissionSaved: 35700,
    headline: 'Modern Craftsman Backing onto Protected Forest in Silver Valley',
    description: 'Serenity found in nature-rich Silver Valley. Backs onto permanent protected greenbelt with private forest trail access right outside your gate. Inside features an open concept kitchen with butcher-block island, gas range, 9-foot ceilings, and a fully finished walk-out basement with recreation room. Perfect for outdoor enthusiasts who love hiking and kayaking.',
    neighborhoodHighlights: '5 minutes to Golden Ears Provincial Park and Alouette Lake. Peaceful semi-rural enclave with city services.',
    recentUpgrades: [
      'New composite two-tier deck overlooking forest canopy',
      'High-efficiency heat pump with AC installed in 2022',
      'Custom fire pit patio in private backyard'
    ],
    inclusions: [
      'Samsung stainless appliance suite',
      'Heavy-duty storage racks in garage',
      'All custom wood blinds'
    ],
    photos: [
      {
        id: 'p20',
        url: CRAFTSMAN_LANGLEY,
        thumbnailUrl: CRAFTSMAN_LANGLEY,
        caption: 'Craftsman facade nestled against towering Pacific cedars',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p21',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Open great room with forest view windows',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-111',
      fileName: 'Maple_Ridge_PropertyTax_2026_Notice.pdf',
      fileSize: '1.4 MB',
      uploadedAt: '2026-10-04T13:50:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 340,
    savesCount: 31,
    inquiriesCount: 7
  },

  // 11. Delta (Ladner) - Heritage-Inspired Family Home
  {
    id: 'dh-delta-4980',
    userId: 'user-seller-lisa',
    sellerName: 'Lisa & Thomas Van Dijk',
    sellerEmail: 'lisa.vandijk@directhome.ca',
    sellerPhone: '604-555-0149',
    status: 'live',
    createdAt: '2026-09-29T10:00:00Z',
    updatedAt: '2026-10-06T14:00:00Z',
    streetAddress: '4980 48th Avenue',
    city: 'Delta',
    province: 'BC',
    postalCode: 'V4K 1V8',
    neighborhood: 'Ladner Historic Village',
    lat: 49.0911,
    lng: -123.0825,
    propertyType: 'Single Family Detached',
    price: 1225000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 2240,
    lotSqft: 5000,
    yearBuilt: 2016,
    parkingSpaces: 2,
    propertyTaxesAnnual: 4920,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 16000,
    estimatedCommissionSaved: 36881,
    headline: 'Heritage-Style Craftsman within Walking Distance of Ladner Village',
    description: 'Charming coastal village living in heart of Ladner. Classic heritage details outside with covered front porch and dormers, paired with a modern open-concept interior. Hardwood flooring, bright white shaker kitchen with quartz counters, and an expansive south-facing sun deck. Walk to local butcher, bakeries, Sunday farmers market, and marina.',
    neighborhoodHighlights: '5-minute walk to Ladner Elementary and Delta Secondary. Easy commute via Hwy 17A to Richmond and Vancouver.',
    recentUpgrades: [
      'Professionally landscaped garden with heritage brick pathway',
      'Tankless continuous hot water system',
      'Designer shiplap accent walls in foyer and living area'
    ],
    inclusions: [
      'KitchenAid stainless gas range and French door fridge',
      'Custom linen drapery in primary suite',
      'Backyard cedar storage shed'
    ],
    photos: [
      {
        id: 'p22',
        url: CRAFTSMAN_LANGLEY,
        thumbnailUrl: CRAFTSMAN_LANGLEY,
        caption: 'Heritage style craftsman with covered front porch',
        isCover: true,
        width: 1400,
        height: 1050
      },
      {
        id: 'p23',
        url: INTERIOR_LIVING,
        thumbnailUrl: INTERIOR_LIVING,
        caption: 'Warm white shaker kitchen and dining room',
        isCover: false,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-112',
      fileName: 'Corporation_of_Delta_TaxNotice_2026.pdf',
      fileSize: '1.2 MB',
      uploadedAt: '2026-09-29T09:40:00Z',
      documentType: 'property_tax_notice',
      status: 'verified'
    },
    viewsCount: 275,
    savesCount: 22,
    inquiriesCount: 6
  },

  // 12. Surrey (Morgan Creek) - In-Review Verification Queue Demo
  {
    id: 'dh-surrey-15420',
    userId: 'user-seller-arjan',
    sellerName: 'Arjan & Simran Gill',
    sellerEmail: 'arjan.gill@directhome.ca',
    sellerPhone: '604-555-0133',
    status: 'in_review',
    createdAt: '2026-10-09T22:30:00Z',
    updatedAt: '2026-10-09T22:30:00Z',
    streetAddress: '15420 32A Avenue',
    city: 'Surrey',
    province: 'BC',
    postalCode: 'V3Z 0H8',
    neighborhood: 'South Surrey / Morgan Creek',
    lat: 49.0615,
    lng: -122.8021,
    propertyType: 'Single Family Detached',
    price: 1495000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2720,
    lotSqft: 6000,
    yearBuilt: 2016,
    parkingSpaces: 2,
    propertyTaxesAnnual: 5800,
    offersCashback: true,
    cashbackType: 'fixed',
    cashbackAmount: 18000,
    estimatedCommissionSaved: 43969,
    headline: 'Updated Family Home on Quiet Cul-de-Sac in Morgan Creek',
    description: 'Freshly submitted home with private sunny yard backing onto protected green space. Features a high vaulted foyer, renovated kitchen with quartz waterfall counters, and generous master bedroom with spa ensuite. Verification documents submitted for review by compliance team.',
    neighborhoodHighlights: 'Walking distance to Morgan Elementary and Southridge School. 5 minutes to Grandview Corners shopping.',
    recentUpgrades: [
      'Newly refinished wide plank white oak floors (2024)',
      'Designer lighting fixtures and brass hardware'
    ],
    inclusions: [
      'All kitchen appliances and built-in microwave drawer'
    ],
    photos: [
      {
        id: 'p9',
        url: CRAFTSMAN_LANGLEY,
        thumbnailUrl: CRAFTSMAN_LANGLEY,
        caption: 'Front garden and craftsman exterior',
        isCover: true,
        width: 1400,
        height: 1050
      }
    ],
    verificationDoc: {
      id: 'doc-105',
      fileName: 'Surrey_Tax_Notice_2026_Account_41829.pdf',
      fileSize: '1.4 MB',
      uploadedAt: '2026-10-09T22:25:00Z',
      documentType: 'property_tax_notice',
      status: 'pending'
    },
    viewsCount: 45,
    savesCount: 4,
    inquiriesCount: 1
  }
];

export const BC_CITIES = [
  'All Cities',
  'Langley',
  'Surrey',
  'Abbotsford',
  'Burnaby',
  'Vancouver',
  'Coquitlam',
  'Chilliwack',
  'Richmond',
  'White Rock',
  'Maple Ridge',
  'Delta',
  'Mission'
];
