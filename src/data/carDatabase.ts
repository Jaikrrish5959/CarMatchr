// =============================================
// CarMatchr — Master Car Database & Types
// =============================================

export interface CarListing {
  id: string;
  make: string;
  model: string;
  variant: string;
  year: number;
  price: number;           // in ₹ Lakhs
  mileage: number;         // in km
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'CNG';
  transmission: 'Manual' | 'Automatic';
  bodyType: 'SUV' | 'Sedan' | 'Hatchback' | 'MUV' | 'Luxury' | 'Coupe' | 'Pickup';
  seatingCapacity: number;
  color: string;
  city: string;
  image: string;
  sellerRating: number;    // 1-5
  sellerName: string;
  features: string[];
  listed: string;          // ISO date
  isFeatured: boolean;
  kmDriven: number;
  owners: number;
}

export interface City {
  name: string;
  state: string;
  icon: string;  // emoji
}

export interface Brand {
  name: string;
  logo: string;
  models: string[];
}

// ---- CITIES ----
export const cities: City[] = [
  { name: 'Mumbai', state: 'Maharashtra', icon: '🏙️' },
  { name: 'Delhi', state: 'Delhi NCR', icon: '🏛️' },
  { name: 'Bangalore', state: 'Karnataka', icon: '💻' },
  { name: 'Chennai', state: 'Tamil Nadu', icon: '🏖️' },
  { name: 'Hyderabad', state: 'Telangana', icon: '🕌' },
  { name: 'Pune', state: 'Maharashtra', icon: '🏞️' },
  { name: 'Kolkata', state: 'West Bengal', icon: '🌉' },
  { name: 'Ahmedabad', state: 'Gujarat', icon: '🏗️' },
  { name: 'Jaipur', state: 'Rajasthan', icon: '🏰' },
  { name: 'Lucknow', state: 'Uttar Pradesh', icon: '🕌' },
  { name: 'Chandigarh', state: 'Punjab', icon: '🌳' },
  { name: 'Kochi', state: 'Kerala', icon: '⛵' },
  { name: 'Coimbatore', state: 'Tamil Nadu', icon: '🏭' },
  { name: 'Indore', state: 'Madhya Pradesh', icon: '🍜' },
  { name: 'Nagpur', state: 'Maharashtra', icon: '🍊' },
  { name: 'Navi Mumbai', state: 'Maharashtra', icon: '🌊' },
];

// ---- BRANDS ----
export const brands: Brand[] = [
  { name: 'Maruti Suzuki', logo: '🚗', models: ['Swift', 'Baleno', 'Brezza', 'Ertiga', 'Dzire', 'Alto', 'WagonR', 'Ciaz', 'Fronx', 'Jimny'] },
  { name: 'Hyundai',       logo: '🏎️', models: ['Creta', 'Venue', 'i20', 'Verna', 'Tucson', 'Alcazar', 'Grand i10', 'Aura', 'Exter'] },
  { name: 'Tata',          logo: '🚙', models: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Tigor', 'Curvv'] },
  { name: 'Mahindra',      logo: '🛻', models: ['Thar', 'XUV700', 'Scorpio N', 'XUV400', 'XUV300', 'Bolero', 'BE 6'] },
  { name: 'Toyota',        logo: '🚘', models: ['Fortuner', 'Innova Crysta', 'Glanza', 'Urban Cruiser', 'Camry', 'Hilux', 'Vellfire'] },
  { name: 'Honda',         logo: '🏁', models: ['City', 'Amaze', 'Elevate', 'WR-V'] },
  { name: 'Kia',           logo: '⚡', models: ['Seltos', 'Sonet', 'Carens', 'EV6', 'EV9'] },
  { name: 'MG',            logo: '🔥', models: ['Hector', 'Astor', 'ZS EV', 'Gloster', 'Comet EV'] },
  { name: 'Volkswagen',    logo: '🇩🇪', models: ['Taigun', 'Virtus', 'Tiguan'] },
  { name: 'Skoda',         logo: '🛡️', models: ['Kushaq', 'Slavia', 'Superb', 'Kodiaq'] },
  { name: 'BMW',           logo: '🏅', models: ['3 Series', '5 Series', 'X1', 'X3', 'X5', 'iX'] },
  { name: 'Mercedes-Benz', logo: '⭐', models: ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class', 'EQS'] },
  { name: 'Audi',          logo: '🔷', models: ['A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron'] },
  { name: 'Jeep',          logo: '🏔️', models: ['Compass', 'Meridian', 'Wrangler', 'Grand Cherokee'] },
  { name: 'Renault',       logo: '💎', models: ['Kwid', 'Triber', 'Kiger'] },
  { name: 'Nissan',        logo: '🌀', models: ['Magnite', 'X-Trail'] },
];

// ---- UNSPLASH IMAGES ----
const carImages: Record<string, string> = {
  SUV:       'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=480&q=80',
  Sedan:     'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=480&q=80',
  Hatchback: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=480&q=80',
  Luxury:    'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=480&q=80',
  MUV:       'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=480&q=80',
  Coupe:     'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=480&q=80',
  Pickup:    'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=480&q=80',
  default1:  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=480&q=80',
  default2:  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=480&q=80',
  default3:  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=480&q=80',
  default4:  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=480&q=80',
  default5:  'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=480&q=80',
};

const imagePool = [carImages.default1, carImages.default2, carImages.default3, carImages.default4, carImages.default5];

function getImage(body: string, index: number): string {
  return carImages[body] || imagePool[index % imagePool.length];
}

const sellerNames = [
  'AutoMax Motors', 'Prime Wheels', 'City Cars Hub', 'Prestige Auto', 'Golden Deals Cars',
  'SpeedKing Motors', 'TrueValue Hub', 'Pioneer Autos', 'Apex Car Mart', 'Royal Drive',
  'NextGen Motors', 'FastTrack Autos', 'Metro Car Zone', 'Skyline Motors', 'Victory Auto',
];

const colors = ['Pearl White', 'Galaxy Blue', 'Midnight Black', 'Fiery Red', 'Silver Metallic', 'Bronze Gold', 'Forest Green', 'Wine Red', 'Titanium Grey', 'Electric Blue'];

const featureSets: string[][] = [
  ['Sunroof', 'Cruise Control', 'Wireless Charging', 'LED Headlamps'],
  ['Ventilated Seats', 'ADAS', 'HUD', '360° Camera'],
  ['Apple CarPlay', 'Android Auto', 'Rear AC Vents', 'Keyless Entry'],
  ['Push Start', 'Rain Sensing Wipers', 'Auto-Dimming IRVM', 'Hill Assist'],
  ['Panoramic Sunroof', 'Air Purifier', 'Electric Tailgate', 'Ambient Lighting'],
];

// ---- GENERATOR ----
function generateListings(): CarListing[] {
  const listings: CarListing[] = [];
  const cityNames = cities.map(c => c.name);
  let id = 1;

  const specs: Array<{
    make: string; model: string; variant: string;
    year: number; price: number; fuel: CarListing['fuelType'];
    trans: CarListing['transmission']; body: CarListing['bodyType'];
    seats: number; km: number; owners: number;
  }> = [
    // Maruti Suzuki
    { make: 'Maruti Suzuki', model: 'Swift', variant: 'ZXi+', year: 2023, price: 5.8, fuel: 'Petrol', trans: 'Manual', body: 'Hatchback', seats: 5, km: 12000, owners: 1 },
    { make: 'Maruti Suzuki', model: 'Baleno', variant: 'Alpha AMT', year: 2022, price: 7.2, fuel: 'Petrol', trans: 'Automatic', body: 'Hatchback', seats: 5, km: 18000, owners: 1 },
    { make: 'Maruti Suzuki', model: 'Brezza', variant: 'ZXi+ AT', year: 2023, price: 12.5, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 8000, owners: 1 },
    { make: 'Maruti Suzuki', model: 'Ertiga', variant: 'ZXi+', year: 2022, price: 10.8, fuel: 'CNG', trans: 'Manual', body: 'MUV', seats: 7, km: 25000, owners: 1 },
    { make: 'Maruti Suzuki', model: 'Dzire', variant: 'ZXi AT', year: 2024, price: 9.5, fuel: 'Petrol', trans: 'Automatic', body: 'Sedan', seats: 5, km: 3000, owners: 1 },
    { make: 'Maruti Suzuki', model: 'Fronx', variant: 'Alpha Turbo', year: 2024, price: 11.2, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 5000, owners: 1 },
    // Hyundai
    { make: 'Hyundai', model: 'Creta', variant: 'SX(O)', year: 2024, price: 18.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 5000, owners: 1 },
    { make: 'Hyundai', model: 'Venue', variant: 'SX+ Turbo', year: 2023, price: 11.9, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 15000, owners: 1 },
    { make: 'Hyundai', model: 'i20', variant: 'Asta(O) CVT', year: 2023, price: 10.4, fuel: 'Petrol', trans: 'Automatic', body: 'Hatchback', seats: 5, km: 9000, owners: 1 },
    { make: 'Hyundai', model: 'Verna', variant: 'SX Turbo', year: 2024, price: 16.2, fuel: 'Petrol', trans: 'Automatic', body: 'Sedan', seats: 5, km: 4000, owners: 1 },
    { make: 'Hyundai', model: 'Tucson', variant: 'Signature', year: 2023, price: 32.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 12000, owners: 1 },
    { make: 'Hyundai', model: 'Alcazar', variant: 'Platinum', year: 2023, price: 21.8, fuel: 'Diesel', trans: 'Automatic', body: 'MUV', seats: 7, km: 14000, owners: 1 },
    // Tata
    { make: 'Tata', model: 'Nexon', variant: 'Fearless+', year: 2024, price: 14.8, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 3000, owners: 1 },
    { make: 'Tata', model: 'Nexon EV', variant: 'Max LR', year: 2024, price: 18.9, fuel: 'Electric', trans: 'Automatic', body: 'SUV', seats: 5, km: 6000, owners: 1 },
    { make: 'Tata', model: 'Punch', variant: 'Creative iRA', year: 2023, price: 8.2, fuel: 'Petrol', trans: 'Manual', body: 'SUV', seats: 5, km: 11000, owners: 1 },
    { make: 'Tata', model: 'Harrier', variant: 'Fearless+', year: 2024, price: 24.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 2000, owners: 1 },
    { make: 'Tata', model: 'Safari', variant: 'Adventure+', year: 2023, price: 26.8, fuel: 'Diesel', trans: 'Automatic', body: 'MUV', seats: 7, km: 15000, owners: 1 },
    { make: 'Tata', model: 'Altroz', variant: 'XZ+ Dark', year: 2023, price: 9.5, fuel: 'Petrol', trans: 'Manual', body: 'Hatchback', seats: 5, km: 10000, owners: 1 },
    // Mahindra
    { make: 'Mahindra', model: 'Thar', variant: 'LX Hard Top', year: 2024, price: 16.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 4, km: 7000, owners: 1 },
    { make: 'Mahindra', model: 'XUV700', variant: 'AX7 L', year: 2024, price: 23.9, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 7, km: 8000, owners: 1 },
    { make: 'Mahindra', model: 'Scorpio N', variant: 'Z8 L', year: 2023, price: 19.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 7, km: 12000, owners: 1 },
    { make: 'Mahindra', model: 'XUV400', variant: 'EL Pro', year: 2024, price: 16.8, fuel: 'Electric', trans: 'Automatic', body: 'SUV', seats: 5, km: 4000, owners: 1 },
    // Toyota
    { make: 'Toyota', model: 'Fortuner', variant: 'Legender', year: 2024, price: 42.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 7, km: 6000, owners: 1 },
    { make: 'Toyota', model: 'Innova Crysta', variant: 'GX+', year: 2023, price: 22.5, fuel: 'Diesel', trans: 'Manual', body: 'MUV', seats: 8, km: 20000, owners: 1 },
    { make: 'Toyota', model: 'Camry', variant: 'Hybrid', year: 2024, price: 46.0, fuel: 'Hybrid', trans: 'Automatic', body: 'Sedan', seats: 5, km: 3000, owners: 1 },
    { make: 'Toyota', model: 'Glanza', variant: 'V AMT', year: 2023, price: 8.8, fuel: 'Petrol', trans: 'Automatic', body: 'Hatchback', seats: 5, km: 14000, owners: 1 },
    // Honda
    { make: 'Honda', model: 'City', variant: 'ZX CVT', year: 2024, price: 14.6, fuel: 'Petrol', trans: 'Automatic', body: 'Sedan', seats: 5, km: 4000, owners: 1 },
    { make: 'Honda', model: 'Elevate', variant: 'ZX CVT', year: 2024, price: 15.2, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 5000, owners: 1 },
    // Kia
    { make: 'Kia', model: 'Seltos', variant: 'GTX+', year: 2024, price: 17.8, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 6000, owners: 1 },
    { make: 'Kia', model: 'Sonet', variant: 'GTX+ AT', year: 2023, price: 13.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 10000, owners: 1 },
    { make: 'Kia', model: 'Carens', variant: 'Luxury+', year: 2023, price: 16.5, fuel: 'Diesel', trans: 'Automatic', body: 'MUV', seats: 7, km: 9000, owners: 1 },
    { make: 'Kia', model: 'EV6', variant: 'GT Line', year: 2024, price: 62.0, fuel: 'Electric', trans: 'Automatic', body: 'SUV', seats: 5, km: 3000, owners: 1 },
    // MG
    { make: 'MG', model: 'Hector', variant: 'Sharp Pro', year: 2024, price: 18.5, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 7000, owners: 1 },
    { make: 'MG', model: 'ZS EV', variant: 'Exclusive Pro', year: 2024, price: 22.8, fuel: 'Electric', trans: 'Automatic', body: 'SUV', seats: 5, km: 5000, owners: 1 },
    { make: 'MG', model: 'Astor', variant: 'Savvy CVT', year: 2023, price: 13.2, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 12000, owners: 1 },
    // Volkswagen / Skoda
    { make: 'Volkswagen', model: 'Taigun', variant: 'GT+ TSI', year: 2023, price: 16.5, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 11000, owners: 1 },
    { make: 'Volkswagen', model: 'Virtus', variant: 'GT+ TSI', year: 2024, price: 15.8, fuel: 'Petrol', trans: 'Automatic', body: 'Sedan', seats: 5, km: 6000, owners: 1 },
    { make: 'Skoda', model: 'Kushaq', variant: 'Style 1.5 TSI', year: 2023, price: 17.2, fuel: 'Petrol', trans: 'Automatic', body: 'SUV', seats: 5, km: 9000, owners: 1 },
    { make: 'Skoda', model: 'Slavia', variant: 'Style 1.5 TSI', year: 2023, price: 16.8, fuel: 'Petrol', trans: 'Automatic', body: 'Sedan', seats: 5, km: 10000, owners: 1 },
    // Luxury
    { make: 'BMW', model: '3 Series', variant: '330Li M Sport', year: 2024, price: 55.0, fuel: 'Petrol', trans: 'Automatic', body: 'Luxury', seats: 5, km: 4000, owners: 1 },
    { make: 'BMW', model: 'X1', variant: 'sDrive20i M Sport', year: 2023, price: 48.5, fuel: 'Petrol', trans: 'Automatic', body: 'Luxury', seats: 5, km: 8000, owners: 1 },
    { make: 'Mercedes-Benz', model: 'C-Class', variant: 'C300d AMG Line', year: 2024, price: 62.0, fuel: 'Diesel', trans: 'Automatic', body: 'Luxury', seats: 5, km: 3000, owners: 1 },
    { make: 'Mercedes-Benz', model: 'GLC', variant: '300 4MATIC', year: 2024, price: 75.0, fuel: 'Petrol', trans: 'Automatic', body: 'Luxury', seats: 5, km: 5000, owners: 1 },
    { make: 'Audi', model: 'Q5', variant: 'Technology', year: 2023, price: 68.0, fuel: 'Petrol', trans: 'Automatic', body: 'Luxury', seats: 5, km: 7000, owners: 1 },
    // Jeep
    { make: 'Jeep', model: 'Compass', variant: 'Model S', year: 2024, price: 28.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 5, km: 4000, owners: 1 },
    { make: 'Jeep', model: 'Meridian', variant: 'Overland', year: 2023, price: 34.5, fuel: 'Diesel', trans: 'Automatic', body: 'SUV', seats: 7, km: 9000, owners: 1 },
  ];

  specs.forEach((s, i) => {
    const cityIndex = i % cityNames.length;
    listings.push({
      id: `car-${id++}`,
      make: s.make,
      model: s.model,
      variant: s.variant,
      year: s.year,
      price: s.price,
      mileage: s.body === 'Hatchback' ? 22 : s.body === 'Sedan' ? 18 : 14,
      fuelType: s.fuel,
      transmission: s.trans,
      bodyType: s.body,
      seatingCapacity: s.seats,
      color: colors[i % colors.length],
      city: cityNames[cityIndex],
      image: getImage(s.body, i),
      sellerRating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
      sellerName: sellerNames[i % sellerNames.length],
      features: featureSets[i % featureSets.length],
      listed: new Date(Date.now() - (Math.floor(Math.random() * 30)) * 86400000).toISOString(),
      isFeatured: i < 8,
      kmDriven: s.km,
      owners: s.owners,
    });
  });

  return listings;
}

export const carListings: CarListing[] = generateListings();

// ---- FILTER OPTIONS ----
export const budgetRanges = [
  { label: 'Under ₹5 Lakh', min: 0, max: 5 },
  { label: '₹5 - 10 Lakh', min: 5, max: 10 },
  { label: '₹10 - 15 Lakh', min: 10, max: 15 },
  { label: '₹15 - 25 Lakh', min: 15, max: 25 },
  { label: '₹25 - 50 Lakh', min: 25, max: 50 },
  { label: '₹50 Lakh+', min: 50, max: Infinity },
];

export const bodyTypes = ['SUV', 'Sedan', 'Hatchback', 'MUV', 'Luxury', 'Coupe', 'Pickup'] as const;
export const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'] as const;
export const transmissions = ['Manual', 'Automatic'] as const;

export type SortOption = 'relevance' | 'price-low' | 'price-high' | 'newest' | 'mileage' | 'km-low';

export function sortListings(list: CarListing[], sort: SortOption): CarListing[] {
  const copy = [...list];
  switch(sort) {
    case 'price-low':  return copy.sort((a,b) => a.price - b.price);
    case 'price-high': return copy.sort((a,b) => b.price - a.price);
    case 'newest':     return copy.sort((a,b) => b.year - a.year);
    case 'mileage':    return copy.sort((a,b) => b.mileage - a.mileage);
    case 'km-low':     return copy.sort((a,b) => a.kmDriven - b.kmDriven);
    default:           return copy.sort((a,b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }
}

export interface Filters {
  city: string;
  make: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  budgetMin: number;
  budgetMax: number;
  search: string;
}

export const defaultFilters: Filters = {
  city: '',
  make: '',
  bodyType: '',
  fuelType: '',
  transmission: '',
  budgetMin: 0,
  budgetMax: Infinity,
  search: '',
};

export function filterListings(list: CarListing[], f: Filters): CarListing[] {
  return list.filter(car => {
    if (f.city && car.city !== f.city) return false;
    if (f.make && car.make !== f.make) return false;
    if (f.bodyType && car.bodyType !== f.bodyType) return false;
    if (f.fuelType && car.fuelType !== f.fuelType) return false;
    if (f.transmission && car.transmission !== f.transmission) return false;
    if (car.price < f.budgetMin || car.price > f.budgetMax) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const searchable = `${car.make} ${car.model} ${car.variant} ${car.color} ${car.city}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });
}

// ---- i18n Translations ----
export type Language = 'en' | 'hi' | 'ta' | 'te' | 'kn';

export const languageNames: Record<Language, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
};

type TranslationKey =
  | 'findCar' | 'postRequirement' | 'becomeBroker' | 'heroTitle1' | 'heroTitle2'
  | 'heroDesc' | 'selectBrand' | 'yourBudget' | 'findMyCar' | 'exploreByBrand'
  | 'popularCars' | 'howItWorks' | 'step1Title' | 'step1Desc'
  | 'step2Title' | 'step2Desc' | 'step3Title' | 'step3Desc'
  | 'readyCTA' | 'ctaDesc' | 'joinBroker' | 'forBuyers' | 'forBrokers' | 'company'
  | 'login' | 'getStarted' | 'logout' | 'dashboard'
  | 'marketplace' | 'filters' | 'sortBy' | 'clearAll' | 'applyFilters'
  | 'budget' | 'bodyType' | 'fuelType' | 'transmission' | 'allCities'
  | 'selectCity' | 'popularCities' | 'detectLocation' | 'carsFound'
  | 'viewAll' | 'mostSearched' | 'compareCars'
  | 'recentlyViewed' | 'noResults' | 'wishlist' | 'growDealership' | 'growDesc';

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    findCar: 'Find your right car',
    postRequirement: 'Post a Requirement',
    becomeBroker: 'Become a Broker',
    heroTitle1: 'Tell us what you want.',
    heroTitle2: "We'll find your deal.",
    heroDesc: 'Post your car requirements and let verified brokers compete to bring you the best price. No searching, no haggling.',
    selectBrand: 'Select Brand',
    yourBudget: 'Your Budget',
    findMyCar: 'Find My Car',
    exploreByBrand: 'Explore by Brand',
    popularCars: 'Popular Cars',
    howItWorks: 'How CarMatchr Works',
    step1Title: 'Post Requirements',
    step1Desc: 'Tell us the Make, Model, Year, Budget, and City. Your requirement goes live instantly.',
    step2Title: 'Smart Matching',
    step2Desc: 'Our engine scores your requirement for brokers based on location, specialization, and trust score.',
    step3Title: 'Choose & Close',
    step3Desc: 'Review competing offers. Accept the best one. Rate the broker to build the trust loop.',
    readyCTA: 'Ready to find your perfect car?',
    ctaDesc: 'Join thousands of buyers who have already found their dream car through our reverse marketplace.',
    joinBroker: 'Join as Broker',
    forBuyers: 'For Buyers',
    forBrokers: 'For Brokers',
    company: 'Company',
    login: 'Log In',
    getStarted: 'Get Started',
    logout: 'Logout',
    dashboard: 'Dashboard',
    marketplace: 'Marketplace',
    filters: 'Filters',
    sortBy: 'Sort by',
    clearAll: 'Clear All',
    applyFilters: 'Apply Filters',
    budget: 'Budget',
    bodyType: 'Body Type',
    fuelType: 'Fuel Type',
    transmission: 'Transmission',
    allCities: 'All Cities',
    selectCity: 'Select Your City',
    popularCities: 'Popular Cities',
    detectLocation: 'Detect my location',
    carsFound: 'cars found',
    viewAll: 'View All',
    mostSearched: 'Most searched cars by buyers this week',
    compareCars: 'Compare Cars',
    recentlyViewed: 'Recently Viewed',
    noResults: 'No cars match your filters. Try broadening your search.',
    wishlist: 'Wishlist',
    growDealership: 'Grow Your Dealership',
    growDesc: 'Access thousands of verified buyer requirements. Submit offers and close deals faster.',
  },
  hi: {
    findCar: 'अपनी सही कार खोजें',
    postRequirement: 'आवश्यकता पोस्ट करें',
    becomeBroker: 'ब्रोकर बनें',
    heroTitle1: 'हमें बताएं आपको क्या चाहिए।',
    heroTitle2: 'हम आपके लिए डील ढूंढेंगे।',
    heroDesc: 'अपनी कार की जरूरत पोस्ट करें और सत्यापित ब्रोकर्स को सबसे अच्छा मूल्य लाने के लिए प्रतिस्पर्धा करने दें।',
    selectBrand: 'ब्रांड चुनें',
    yourBudget: 'आपका बजट',
    findMyCar: 'मेरी कार खोजें',
    exploreByBrand: 'ब्रांड से खोजें',
    popularCars: 'लोकप्रिय कारें',
    howItWorks: 'CarMatchr कैसे काम करता है',
    step1Title: 'आवश्यकता पोस्ट करें',
    step1Desc: 'मेक, मॉडल, वर्ष, बजट और शहर बताएं।',
    step2Title: 'स्मार्ट मैचिंग',
    step2Desc: 'हमारा इंजन ब्रोकर्स के लिए लोकेशन, विशेषज्ञता और ट्रस्ट स्कोर के आधार पर स्कोर करता है।',
    step3Title: 'चुनें और पूरा करें',
    step3Desc: 'प्रतिस्पर्धी ऑफर्स की समीक्षा करें। सबसे अच्छा चुनें।',
    readyCTA: 'अपनी सही कार खोजने के लिए तैयार?',
    ctaDesc: 'हजारों खरीदारों से जुड़ें जिन्होंने पहले ही अपनी ड्रीम कार ढूंढ ली है।',
    joinBroker: 'ब्रोकर बनें',
    forBuyers: 'खरीदारों के लिए',
    forBrokers: 'ब्रोकर्स के लिए',
    company: 'कंपनी',
    login: 'लॉगिन',
    getStarted: 'शुरू करें',
    logout: 'लॉगआउट',
    dashboard: 'डैशबोर्ड',
    marketplace: 'मार्केटप्लेस',
    filters: 'फ़िल्टर',
    sortBy: 'क्रमबद्ध करें',
    clearAll: 'सभी हटाएं',
    applyFilters: 'फ़िल्टर लागू करें',
    budget: 'बजट',
    bodyType: 'बॉडी टाइप',
    fuelType: 'ईंधन प्रकार',
    transmission: 'ट्रांसमिशन',
    allCities: 'सभी शहर',
    selectCity: 'अपना शहर चुनें',
    popularCities: 'लोकप्रिय शहर',
    detectLocation: 'मेरा स्थान पहचानें',
    carsFound: 'कारें मिलीं',
    viewAll: 'सभी देखें',
    mostSearched: 'इस हफ्ते सबसे ज्यादा खोजी गई कारें',
    compareCars: 'कारों की तुलना करें',
    recentlyViewed: 'हाल में देखी गई',
    noResults: 'कोई कार नहीं मिली। अपनी खोज बढ़ाएं।',
    wishlist: 'इच्छा सूची',
    growDealership: 'अपनी डीलरशिप बढ़ाएं',
    growDesc: 'हजारों सत्यापित खरीदार आवश्यकताओं तक पहुंचें।',
  },
  ta: {
    findCar: 'உங்கள் சரியான காரைக் கண்டறியுங்கள்',
    postRequirement: 'தேவையை பதிவிடுங்கள்',
    becomeBroker: 'தரகராகுங்கள்',
    heroTitle1: 'நீங்கள் என்ன விரும்புகிறீர்கள் என்று சொல்லுங்கள்.',
    heroTitle2: 'நாங்கள் உங்கள் ஒப்பந்தத்தைக் கண்டுபிடிப்போம்.',
    heroDesc: 'உங்கள் கார் தேவைகளை பதிவிடுங்கள், சரிபார்க்கப்பட்ட தரகர்கள் சிறந்த விலையை கொண்டு வர போட்டியிடுவார்கள்.',
    selectBrand: 'பிராண்ட் தேர்வு',
    yourBudget: 'உங்கள் பட்ஜெட்',
    findMyCar: 'என் காரைக் கண்டறி',
    exploreByBrand: 'பிராண்ட் மூலம் ஆராய',
    popularCars: 'பிரபலமான கார்கள்',
    howItWorks: 'CarMatchr எப்படி வேலை செய்கிறது',
    step1Title: 'தேவையை பதிவிடுங்கள்',
    step1Desc: 'மேக், மாடல், ஆண்டு, பட்ஜெட் மற்றும் நகரத்தை குறிப்பிடுங்கள்.',
    step2Title: 'ஸ்மார்ட் மேட்சிங்',
    step2Desc: 'இருப்பிடம், நிபுணத்துவம் மற்றும் நம்பிக்கை மதிப்பெண் அடிப்படையில் மதிப்பிடுகிறது.',
    step3Title: 'தேர்வு செய்யுங்கள்',
    step3Desc: 'போட்டி சலுகைகளை மதிப்பாய்வு செய்யுங்கள். சிறந்ததை ஏற்றுக்கொள்ளுங்கள்.',
    readyCTA: 'உங்கள் சரியான காரைக் கண்டுபிடிக்க தயாரா?',
    ctaDesc: 'எங்கள் மார்க்கெட்பிளேஸ் மூலம் ஆயிரக்கணக்கான வாங்குபவர்களுடன் இணையுங்கள்.',
    joinBroker: 'தரகராக இணையுங்கள்',
    forBuyers: 'வாங்குபவர்களுக்கு',
    forBrokers: 'தரகர்களுக்கு',
    company: 'நிறுவனம்',
    login: 'உள்நுழை',
    getStarted: 'தொடங்குங்கள்',
    logout: 'வெளியேறு',
    dashboard: 'டாஷ்போர்ட்',
    marketplace: 'சந்தை',
    filters: 'வடிகட்டி',
    sortBy: 'வரிசைப்படுத்து',
    clearAll: 'அனைத்தையும் நீக்கு',
    applyFilters: 'வடிகட்டி பயன்படுத்து',
    budget: 'பட்ஜெட்',
    bodyType: 'பாடி வகை',
    fuelType: 'எரிபொருள் வகை',
    transmission: 'டிரான்ஸ்மிஷன்',
    allCities: 'அனைத்து நகரங்கள்',
    selectCity: 'உங்கள் நகரத்தை தேர்வு செய்யுங்கள்',
    popularCities: 'பிரபலமான நகரங்கள்',
    detectLocation: 'என் இருப்பிடத்தை கண்டறி',
    carsFound: 'கார்கள் கிடைத்தன',
    viewAll: 'அனைத்தையும் காண்',
    mostSearched: 'இந்த வாரம் அதிகம் தேடப்பட்ட கார்கள்',
    compareCars: 'கார்களை ஒப்பிடு',
    recentlyViewed: 'சமீபத்தில் பார்த்தவை',
    noResults: 'உங்கள் வடிகட்டிகளுக்கு கார்கள் இல்லை.',
    wishlist: 'விருப்ப பட்டியல்',
    growDealership: 'உங்கள் டீலர்ஷிப்பை வளர்க்கவும்',
    growDesc: 'ஆயிரக்கணக்கான சரிபார்க்கப்பட்ட வாங்குபவர் தேவைகளை அணுகுங்கள்.',
  },
  te: {
    findCar: 'మీ సరైన కారును కనుగొనండి',
    postRequirement: 'అవసరాన్ని పోస్ట్ చేయండి',
    becomeBroker: 'బ్రోకర్ అవ్వండి',
    heroTitle1: 'మీకు ఏం కావాలో చెప్పండి.',
    heroTitle2: 'మేం మీ డీల్ కనుగొంటాం.',
    heroDesc: 'మీ కారు అవసరాలను పోస్ట్ చేయండి మరియు ధృవీకరించబడిన బ్రోకర్లు ఉత్తమ ధరను అందించడానికి పోటీపడనివ్వండి.',
    selectBrand: 'బ్రాండ్ ఎంచుకోండి',
    yourBudget: 'మీ బడ్జెట్',
    findMyCar: 'నా కారు కనుగొనండి',
    exploreByBrand: 'బ్రాండ్ ద్వారా అన్వేషించండి',
    popularCars: 'జనప్రియ కార్లు',
    howItWorks: 'CarMatchr ఎలా పనిచేస్తుంది',
    step1Title: 'అవసరాలను పోస్ట్ చేయండి',
    step1Desc: 'మేక్, మోడల్, సంవత్సరం, బడ్జెట్ మరియు నగరం చెప్పండి.',
    step2Title: 'స్మార్ట్ మ్యాచింగ్',
    step2Desc: 'స్థానం, ప్రత్యేకత మరియు నమ్మకం ఆధారంగా స్కోర్ చేస్తుంది.',
    step3Title: 'ఎంచుకోండి & పూర్తి చేయండి',
    step3Desc: 'పోటీ ఆఫర్లను సమీక్షించండి. ఉత్తమమైనదాన్ని ఎంచుకోండి.',
    readyCTA: 'మీ సరైన కారు కనుగొనడానికి సిద్ధంగా ఉన్నారా?',
    ctaDesc: 'వేలాది కొనుగోలుదారులతో చేరండి.',
    joinBroker: 'బ్రోకర్‌గా చేరండి',
    forBuyers: 'కొనుగోలుదారులకు',
    forBrokers: 'బ్రోకర్లకు',
    company: 'కంపెనీ',
    login: 'లాగిన్',
    getStarted: 'ప్రారంభించండి',
    logout: 'లాగ్అవుట్',
    dashboard: 'డాష్‌బోర్డ్',
    marketplace: 'మార్కెట్‌ప్లేస్',
    filters: 'ఫిల్టర్లు',
    sortBy: 'క్రమం',
    clearAll: 'అన్నీ తొలగించు',
    applyFilters: 'ఫిల్టర్లు వర్తింపజేయి',
    budget: 'బడ్జెట్',
    bodyType: 'బాడీ టైప్',
    fuelType: 'ఇంధన రకం',
    transmission: 'ట్రాన్స్‌మిషన్',
    allCities: 'అన్ని నగరాలు',
    selectCity: 'మీ నగరాన్ని ఎంచుకోండి',
    popularCities: 'ప్రసిద్ధ నగరాలు',
    detectLocation: 'నా స్థానాన్ని గుర్తించు',
    carsFound: 'కార్లు దొరికాయి',
    viewAll: 'అన్నీ చూడండి',
    mostSearched: 'ఈ వారం అత్యధికంగా వెతకబడిన కార్లు',
    compareCars: 'కార్లను పోల్చండి',
    recentlyViewed: 'ఇటీవల చూసినవి',
    noResults: 'మీ ఫిల్టర్లకు కార్లు లేవు.',
    wishlist: 'ఇష్ట జాబితా',
    growDealership: 'మీ డీలర్‌షిప్ పెంచుకోండి',
    growDesc: 'వేలాది ధృవీకరించబడిన కొనుగోలుదారుల అవసరాలను యాక్సెస్ చేయండి.',
  },
  kn: {
    findCar: 'ನಿಮ್ಮ ಸರಿಯಾದ ಕಾರನ್ನು ಹುಡುಕಿ',
    postRequirement: 'ಅವಶ್ಯಕತೆಯನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿ',
    becomeBroker: 'ಬ್ರೋಕರ್ ಆಗಿ',
    heroTitle1: 'ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ಹೇಳಿ.',
    heroTitle2: 'ನಾವು ನಿಮ್ಮ ಡೀಲ್ ಹುಡುಕುತ್ತೇವೆ.',
    heroDesc: 'ನಿಮ್ಮ ಕಾರಿನ ಅಗತ್ಯಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿ ಮತ್ತು ಪ‌ರಿಶೀಲಿತ ಬ್ರೋಕರ್‌ಗಳು ಉತ್ತಮ ಬೆಲೆಯನ್ನು ತರಲು ಸ್ಪರ್ಧಿಸಲಿ.',
    selectBrand: 'ಬ್ರ್ಯಾಂಡ್ ಆಯ್ಕೆಮಾಡಿ',
    yourBudget: 'ನಿಮ್ಮ ಬಜೆಟ್',
    findMyCar: 'ನನ್ನ ಕಾರನ್ನು ಹುಡುಕಿ',
    exploreByBrand: 'ಬ್ರ್ಯಾಂಡ್ ಮೂಲಕ ಅನ್ವೇಷಿಸಿ',
    popularCars: 'ಜನಪ್ರಿಯ ಕಾರುಗಳು',
    howItWorks: 'CarMatchr ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    step1Title: 'ಅಗತ್ಯಗಳನ್ನು ಪೋಸ್ಟ್ ಮಾಡಿ',
    step1Desc: 'ಮೇಕ್, ಮಾಡೆಲ್, ವರ್ಷ, ಬಜೆಟ್ ಮತ್ತು ನಗರವನ್ನು ಹೇಳಿ.',
    step2Title: 'ಸ್ಮಾರ್ಟ್ ಮ್ಯಾಚಿಂಗ್',
    step2Desc: 'ಸ್ಥಳ, ವಿಶೇಷತೆ ಮತ್ತು ವಿಶ್ವಾಸ ಸ್ಕೋರ್ ಆಧಾರದ ಮೇಲೆ ಸ್ಕೋರ್ ಮಾಡುತ್ತದೆ.',
    step3Title: 'ಆಯ್ಕೆ ಮಾಡಿ ಮತ್ತು ಮುಗಿಸಿ',
    step3Desc: 'ಪ್ರತಿಸ್ಪರ್ಧಿ ಕೊಡುಗೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಉತ್ತಮವಾದದ್ದನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.',
    readyCTA: 'ನಿಮ್ಮ ಸರಿಯಾದ ಕಾರನ್ನು ಹುಡುಕಲು ಸಿದ್ಧರಿದ್ದೀರಾ?',
    ctaDesc: 'ಸಾವಿರಾರು ಖರೀದಿದಾರರೊಂದಿಗೆ ಸೇರಿ.',
    joinBroker: 'ಬ್ರೋಕರ್ ಆಗಿ ಸೇರಿ',
    forBuyers: 'ಖರೀದಿದಾರರಿಗೆ',
    forBrokers: 'ಬ್ರೋಕರ್‌ಗಳಿಗೆ',
    company: 'ಕಂಪನಿ',
    login: 'ಲಾಗಿನ್',
    getStarted: 'ಪ್ರಾರಂಭಿಸಿ',
    logout: 'ಲಾಗ್ಔಟ್',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    marketplace: 'ಮಾರುಕಟ್ಟೆ',
    filters: 'ಫಿಲ್ಟರ್‌ಗಳು',
    sortBy: 'ವಿಂಗಡಿಸಿ',
    clearAll: 'ಎಲ್ಲಾ ತೆರವುಗೊಳಿಸಿ',
    applyFilters: 'ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಅನ್ವಯಿಸಿ',
    budget: 'ಬಜೆಟ್',
    bodyType: 'ಬಾಡಿ ಟೈಪ್',
    fuelType: 'ಇಂಧನ ಪ್ರಕಾರ',
    transmission: 'ಟ್ರಾನ್ಸ್‌ಮಿಷನ್',
    allCities: 'ಎಲ್ಲಾ ನಗರಗಳು',
    selectCity: 'ನಿಮ್ಮ ನಗರವನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    popularCities: 'ಜನಪ್ರಿಯ ನಗರಗಳು',
    detectLocation: 'ನನ್ನ ಸ್ಥಳವನ್ನು ಕಂಡುಹಿಡಿ',
    carsFound: 'ಕಾರುಗಳು ಕಂಡುಬಂದವು',
    viewAll: 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
    mostSearched: 'ಈ ವಾರ ಅತ್ಯಂತ ಹೆಚ್ಚು ಹುಡುಕಲ್ಪಟ್ಟ ಕಾರುಗಳು',
    compareCars: 'ಕಾರುಗಳನ್ನು ಹೋಲಿಸಿ',
    recentlyViewed: 'ಇತ್ತೀಚೆಗೆ ನೋಡಿದ',
    noResults: 'ನಿಮ್ಮ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಕಾರುಗಳಿಲ್ಲ.',
    wishlist: 'ಬಯಕೆ ಪಟ್ಟಿ',
    growDealership: 'ನಿಮ್ಮ ಡೀಲರ್‌ಶಿಪ್ ಬೆಳೆಸಿ',
    growDesc: 'ಸಾವಿರಾರು ಪರಿಶೀಲಿತ ಖರೀದಿದಾರರ ಅಗತ್ಯಗಳನ್ನು ಪ್ರವೇಶಿಸಿ.',
  },
};
