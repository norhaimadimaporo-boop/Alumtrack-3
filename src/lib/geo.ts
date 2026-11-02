/**
 * Small offline gazetteer used to turn the free-text city/province an alumnus
 * types into coordinates for the GIS map. The data is intentionally compact:
 * major Philippine cities, all Philippine provinces (province centroids), and
 * the overseas cities/countries where MSU alumni commonly work.
 *
 * Coordinates are stored on `alumni_profiles` when the profile is saved, so the
 * map never has to geocode at request time.
 */

export type GeoPrecision = "city" | "state";

export type ResolvedLocation = {
  /** Country shown in the map popup and used by the country filter. */
  country: string;
  /** Province / state / emirate label. */
  region: string;
  /** City or municipality label. */
  city: string;
  precision: GeoPrecision;
  lat: number;
  lng: number;
  /** False when the address could not be matched and the country fallback was used. */
  matched: boolean;
};

type Place = {
  country: string;
  region: string;
  city: string;
  lat: number;
  lng: number;
  precision: GeoPrecision;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(city|municipality|municipal|mun\.?)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** City-level entries: [city, province, region, lat, lng]. */
const PH_CITIES: Array<[string, string, string, number, number]> = [
  ["Marawi", "Lanao del Sur", "BARMM", 8.0, 124.29],
  ["Taguig", "Metro Manila", "NCR — Metro Manila", 14.5176, 121.0509],
  ["Makati", "Metro Manila", "NCR — Metro Manila", 14.5547, 121.0244],
  ["Quezon", "Metro Manila", "NCR — Metro Manila", 14.676, 121.0437],
  ["Manila", "Metro Manila", "NCR — Metro Manila", 14.5995, 120.9842],
  ["Pasig", "Metro Manila", "NCR — Metro Manila", 14.5764, 121.0851],
  ["Caloocan", "Metro Manila", "NCR — Metro Manila", 14.6507, 120.9675],
  ["Parañaque", "Metro Manila", "NCR — Metro Manila", 14.4793, 121.0198],
  ["Las Piñas", "Metro Manila", "NCR — Metro Manila", 14.4445, 120.9939],
  ["Mandaluyong", "Metro Manila", "NCR — Metro Manila", 14.5794, 121.0359],
  ["Marikina", "Metro Manila", "NCR — Metro Manila", 14.6507, 121.1029],
  ["Muntinlupa", "Metro Manila", "NCR — Metro Manila", 14.4081, 121.0415],
  ["Navotas", "Metro Manila", "NCR — Metro Manila", 14.6691, 120.9404],
  ["Malabon", "Metro Manila", "NCR — Metro Manila", 14.6626, 120.9573],
  ["San Juan", "Metro Manila", "NCR — Metro Manila", 14.6019, 121.0355],
  ["Valenzuela", "Metro Manila", "NCR — Metro Manila", 14.7011, 120.983],
  ["Pateros", "Metro Manila", "NCR — Metro Manila", 14.5454, 121.0685],
  ["Cagayan de Oro", "Misamis Oriental", "Region X — Northern Mindanao", 8.4542, 124.6319],
  ["Iligan", "Lanao del Norte", "Region X — Northern Mindanao", 8.228, 124.2452],
  ["Davao", "Davao del Sur", "Region XI — Davao", 7.1907, 125.4553],
  ["Cotabato", "Maguindanao", "BARMM", 7.2047, 124.231],
  ["Zamboanga", "Zamboanga del Sur", "Region IX — Zamboanga Peninsula", 6.9214, 122.079],
  ["General Santos", "South Cotabato", "Region XII — SOCCSKSARGEN", 6.1164, 125.1716],
  ["Bacolod", "Negros Occidental", "Region VI — Western Visayas", 10.6765, 122.9509],
  ["Iloilo", "Iloilo", "Region VI — Western Visayas", 10.7202, 122.5621],
  ["Cebu", "Cebu", "Region VII — Central Visayas", 10.3157, 123.8854],
  ["Lapu-Lapu", "Cebu", "Region VII — Central Visayas", 10.3103, 123.9494],
  ["Mandaue", "Cebu", "Region VII — Central Visayas", 10.3237, 123.9223],
  ["Baguio", "Benguet", "CAR — Cordillera", 16.4023, 120.596],
  ["Dumaguete", "Negros Oriental", "Region VII — Central Visayas", 9.3068, 123.3054],
  ["Butuan", "Agusan del Norte", "Region XIII — Caraga", 8.9475, 125.5406],
  ["Tacloban", "Leyte", "Region VIII — Eastern Visayas", 11.2433, 125.0047],
  ["Legazpi", "Albay", "Region V — Bicol", 13.1391, 123.7438],
  ["Naga", "Camarines Sur", "Region V — Bicol", 13.6192, 123.1814],
  ["Batangas", "Batangas", "Region IV-A — CALABARZON", 13.7565, 121.0583],
  ["Lucena", "Quezon", "Region IV-A — CALABARZON", 13.9341, 121.6173],
  ["Malolos", "Bulacan", "Region III — Central Luzon", 14.8443, 120.8114],
  ["San Fernando", "Pampanga", "Region III — Central Luzon", 15.0286, 120.6898],
  ["Angeles", "Pampanga", "Region III — Central Luzon", 15.145, 120.5888],
  ["Olongapo", "Zambales", "Region III — Central Luzon", 14.8294, 120.2828],
  ["Antipolo", "Rizal", "Region IV-A — CALABARZON", 14.5878, 121.1761],
  ["Calamba", "Laguna", "Region IV-A — CALABARZON", 14.2117, 121.1653],
  ["Santa Rosa", "Laguna", "Region IV-A — CALABARZON", 14.3122, 121.1114],
  ["Balabagan", "Lanao del Sur", "BARMM", 7.5333, 124.1167],
  ["Malabang", "Lanao del Sur", "BARMM", 7.6167, 124.0667],
  ["Wao", "Lanao del Sur", "BARMM", 7.6833, 124.7333],
  ["Binidayan", "Lanao del Sur", "BARMM", 7.8, 124.1667],
  ["Marantao", "Lanao del Sur", "BARMM", 7.9167, 124.3167],
  ["Masiu", "Lanao del Sur", "BARMM", 7.9667, 124.3833],
  ["Saguiaran", "Lanao del Sur", "BARMM", 8.0333, 124.2667],
  ["Piagapo", "Lanao del Sur", "BARMM", 8.0333, 124.3333],
  ["Taraka", "Lanao del Sur", "BARMM", 7.9, 124.3333],
  ["Tugaya", "Lanao del Sur", "BARMM", 7.9333, 124.2667],
  ["Baloi", "Lanao del Norte", "Region X — Northern Mindanao", 8.1167, 124.25],
  ["Tubod", "Lanao del Norte", "Region X — Northern Mindanao", 8.0544, 123.7936],
  ["Kolambugan", "Lanao del Norte", "Region X — Northern Mindanao", 8.1167, 123.9],
  ["Linamon", "Lanao del Norte", "Region X — Northern Mindanao", 8.1833, 124.1667],
  ["Kauswagan", "Lanao del Norte", "Region X — Northern Mindanao", 8.1833, 124.0833],
  ["Matungao", "Lanao del Norte", "Region X — Northern Mindanao", 8.1333, 124.1833],
  ["Munai", "Lanao del Norte", "Region X — Northern Mindanao", 8.0, 124.0833],
  ["Nunungan", "Lanao del Norte", "Region X — Northern Mindanao", 7.85, 123.9667],
  ["Sapad", "Lanao del Norte", "Region X — Northern Mindanao", 7.85, 123.8333],
  ["Salvador", "Lanao del Norte", "Region X — Northern Mindanao", 7.9, 123.8333],
  ["Tangcal", "Lanao del Norte", "Region X — Northern Mindanao", 8.0, 124.0],
  ["Poona Piagapo", "Lanao del Norte", "Region X — Northern Mindanao", 8.0833, 124.1833],
  ["Kapatagan", "Lanao del Norte", "Region X — Northern Mindanao", 7.7833, 123.8333],
  ["Sultan Naga Dimaporo", "Lanao del Norte", "Region X — Northern Mindanao", 7.7167, 123.7667],
  ["Pantao Ragat", "Lanao del Norte", "Region X — Northern Mindanao", 8.05, 124.25],
  ["Pantar", "Lanao del Norte", "Region X — Northern Mindanao", 8.0667, 124.2667],
  ["Balo-i", "Lanao del Norte", "Region X — Northern Mindanao", 8.1167, 124.25],
  ["Bumbaran", "Lanao del Sur", "BARMM", 7.8, 124.6833],
  ["Maguing", "Lanao del Sur", "BARMM", 7.9167, 124.4],
  ["Buadiposo-Buntong", "Lanao del Sur", "BARMM", 7.9667, 124.3833],
  ["Molundo", "Lanao del Sur", "BARMM", 7.9333, 124.3167],
  ["Tamparan", "Lanao del Sur", "BARMM", 7.8667, 124.35],
  ["Lumba-a-Bayabao", "Lanao del Sur", "BARMM", 7.8, 124.45],
  ["Bacolod-Kalawi", "Lanao del Sur", "BARMM", 7.8667, 124.05],
  ["Ganassi", "Lanao del Sur", "BARMM", 7.85, 124.1],
  ["Madalum", "Lanao del Sur", "BARMM", 7.9667, 124.05],
  ["Madamba", "Lanao del Sur", "BARMM", 7.85, 124.05],
  ["Pualas", "Lanao del Sur", "BARMM", 7.8, 124.05],
  ["Bayang", "Lanao del Sur", "BARMM", 7.7667, 124.2],
  ["Lumbatan", "Lanao del Sur", "BARMM", 7.7833, 124.25],
  ["Sultan Dumalondong", "Lanao del Sur", "BARMM", 7.7, 124.3],
  ["Kapatagan", "Lanao del Sur", "BARMM", 7.45, 124.15],
  ["Picong", "Lanao del Sur", "BARMM", 7.6333, 123.95],
  ["Butig", "Lanao del Sur", "BARMM", 7.75, 124.3],
  ["Sultan Mastura", "Maguindanao", "BARMM", 7.25, 124.3],
  ["Kabuntalan", "Maguindanao", "BARMM", 7.1167, 124.3833],
  ["Datu Odin Sinsuat", "Maguindanao", "BARMM", 7.0167, 124.3167],
  ["Parang", "Maguindanao", "BARMM", 7.3667, 124.2667],
  ["Buluan", "Maguindanao", "BARMM", 6.7167, 124.8],
];

/** Province / region centroids: [province, region, lat, lng]. */
const PH_PROVINCES: Array<[string, string, number, number]> = [
  ["Metro Manila", "NCR — Metro Manila", 14.5995, 120.9842],
  ["Abra", "CAR — Cordillera", 17.6, 120.7],
  ["Apayao", "CAR — Cordillera", 18.0, 121.2],
  ["Benguet", "CAR — Cordillera", 16.5, 120.6667],
  ["Ifugao", "CAR — Cordillera", 16.8, 121.1667],
  ["Kalinga", "CAR — Cordillera", 17.5, 121.25],
  ["Mountain Province", "CAR — Cordillera", 17.0833, 121.0],
  ["Ilocos Norte", "Region I — Ilocos", 18.1649, 120.7115],
  ["Ilocos Sur", "Region I — Ilocos", 17.5747, 120.3866],
  ["La Union", "Region I — Ilocos", 16.6159, 120.3209],
  ["Pangasinan", "Region I — Ilocos", 15.8949, 120.5685],
  ["Batanes", "Region II — Cagayan Valley", 20.4488, 121.9707],
  ["Cagayan", "Region II — Cagayan Valley", 17.6132, 121.727],
  ["Isabela", "Region II — Cagayan Valley", 16.9754, 121.8107],
  ["Nueva Vizcaya", "Region II — Cagayan Valley", 16.33, 121.171],
  ["Quirino", "Region II — Cagayan Valley", 16.4, 121.7],
  ["Aurora", "Region III — Central Luzon", 15.75, 121.55],
  ["Bataan", "Region III — Central Luzon", 14.6667, 120.4167],
  ["Bulacan", "Region III — Central Luzon", 14.8443, 120.8224],
  ["Nueva Ecija", "Region III — Central Luzon", 15.5783, 121.1114],
  ["Pampanga", "Region III — Central Luzon", 15.0333, 120.6833],
  ["Tarlac", "Region III — Central Luzon", 15.4755, 120.596],
  ["Zambales", "Region III — Central Luzon", 15.5082, 120.0693],
  ["Batangas", "Region IV-A — CALABARZON", 13.7565, 121.0583],
  ["Cavite", "Region IV-A — CALABARZON", 14.2456, 120.8786],
  ["Laguna", "Region IV-A — CALABARZON", 14.2691, 121.41],
  ["Quezon", "Region IV-A — CALABARZON", 13.9341, 121.6173],
  ["Rizal", "Region IV-A — CALABARZON", 14.6037, 121.3084],
  ["Marinduque", "MIMAROPA", 13.4, 121.8333],
  ["Occidental Mindoro", "MIMAROPA", 12.8167, 120.9167],
  ["Oriental Mindoro", "MIMAROPA", 13.05, 121.25],
  ["Palawan", "MIMAROPA", 9.8349, 118.7384],
  ["Romblon", "MIMAROPA", 12.5667, 122.2833],
  ["Albay", "Region V — Bicol", 13.1916, 123.6926],
  ["Camarines Norte", "Region V — Bicol", 14.1167, 122.95],
  ["Camarines Sur", "Region V — Bicol", 13.5667, 123.1833],
  ["Catanduanes", "Region V — Bicol", 13.7, 124.25],
  ["Masbate", "Region V — Bicol", 12.3667, 123.6167],
  ["Sorsogon", "Region V — Bicol", 12.9667, 124.0],
  ["Aklan", "Region VI — Western Visayas", 11.7, 122.3667],
  ["Antique", "Region VI — Western Visayas", 10.75, 122.0833],
  ["Capiz", "Region VI — Western Visayas", 11.5833, 122.75],
  ["Guimaras", "Region VI — Western Visayas", 10.5833, 122.5833],
  ["Iloilo", "Region VI — Western Visayas", 10.9167, 122.5667],
  ["Negros Occidental", "Region VI — Western Visayas", 10.3167, 123.0833],
  ["Bohol", "Region VII — Central Visayas", 9.8333, 124.1667],
  ["Cebu", "Region VII — Central Visayas", 10.3167, 123.9167],
  ["Negros Oriental", "Region VII — Central Visayas", 9.75, 123.0],
  ["Siquijor", "Region VII — Central Visayas", 9.2, 123.6],
  ["Biliran", "Region VIII — Eastern Visayas", 11.5833, 124.4667],
  ["Eastern Samar", "Region VIII — Eastern Visayas", 11.5333, 125.4667],
  ["Leyte", "Region VIII — Eastern Visayas", 10.9167, 124.9167],
  ["Northern Samar", "Region VIII — Eastern Visayas", 12.3333, 124.6667],
  ["Samar", "Region VIII — Eastern Visayas", 11.9167, 125.0],
  ["Southern Leyte", "Region VIII — Eastern Visayas", 10.3333, 124.9667],
  ["Zamboanga del Norte", "Region IX — Zamboanga Peninsula", 8.1667, 123.0],
  ["Zamboanga del Sur", "Region IX — Zamboanga Peninsula", 7.8333, 123.0],
  ["Zamboanga Sibugay", "Region IX — Zamboanga Peninsula", 7.75, 122.75],
  ["Bukidnon", "Region X — Northern Mindanao", 8.0, 125.0],
  ["Camiguin", "Region X — Northern Mindanao", 9.1667, 124.7167],
  ["Lanao del Norte", "Region X — Northern Mindanao", 8.0, 123.8333],
  ["Misamis Occidental", "Region X — Northern Mindanao", 8.3333, 123.7],
  ["Misamis Oriental", "Region X — Northern Mindanao", 8.5833, 124.75],
  ["Davao de Oro", "Region XI — Davao", 7.5, 126.0],
  ["Davao del Norte", "Region XI — Davao", 7.45, 125.8],
  ["Davao del Sur", "Region XI — Davao", 6.5, 125.25],
  ["Davao Occidental", "Region XI — Davao", 6.25, 125.5],
  ["Davao Oriental", "Region XI — Davao", 7.0, 126.3333],
  ["Cotabato", "Region XII — SOCCSKSARGEN", 7.1667, 124.8333],
  ["Sarangani", "Region XII — SOCCSKSARGEN", 6.0, 125.1667],
  ["South Cotabato", "Region XII — SOCCSKSARGEN", 6.25, 124.8333],
  ["Sultan Kudarat", "Region XII — SOCCSKSARGEN", 6.5, 124.5],
  ["Agusan del Norte", "Region XIII — Caraga", 9.0, 125.5],
  ["Agusan del Sur", "Region XIII — Caraga", 8.5, 125.8333],
  ["Dinagat Islands", "Region XIII — Caraga", 10.1, 125.6],
  ["Surigao del Norte", "Region XIII — Caraga", 9.6667, 125.5],
  ["Surigao del Sur", "Region XIII — Caraga", 8.6667, 126.0],
  ["Basilan", "BARMM", 6.5667, 122.0333],
  ["Lanao del Sur", "BARMM", 7.9167, 124.3333],
  ["Maguindanao", "BARMM", 7.0, 124.5],
  ["Sulu", "BARMM", 6.0, 121.0],
  ["Tawi-Tawi", "BARMM", 5.1667, 120.0],
];

/** Common overseas cities: [city, region, country, lat, lng]. */
const FOREIGN_CITIES: Array<[string, string, string, number, number]> = [
  ["Dubai", "Dubai Emirate", "United Arab Emirates", 25.2048, 55.2708],
  ["Abu Dhabi", "Abu Dhabi", "United Arab Emirates", 24.4539, 54.3773],
  ["Sharjah", "Sharjah", "United Arab Emirates", 25.3463, 55.4209],
  ["Al Ain", "Abu Dhabi", "United Arab Emirates", 24.1302, 55.8023],
  ["Riyadh", "Riyadh Province", "Saudi Arabia", 24.7136, 46.6753],
  ["Jeddah", "Makkah Province", "Saudi Arabia", 21.4858, 39.1925],
  ["Dammam", "Eastern Province", "Saudi Arabia", 26.4207, 50.0888],
  ["Mecca", "Makkah Province", "Saudi Arabia", 21.3891, 39.8579],
  ["Medina", "Al Madinah Province", "Saudi Arabia", 24.5247, 39.5692],
  ["Doha", "Ad Dawhah", "Qatar", 25.2854, 51.531],
  ["Kuwait City", "Al Asimah", "Kuwait", 29.3759, 47.9774],
  ["Manama", "Capital Governorate", "Bahrain", 26.2285, 50.586],
  ["Muscat", "Muscat", "Oman", 23.588, 58.3829],
  ["Kuala Lumpur", "Federal Territory", "Malaysia", 3.139, 101.6869],
  ["Singapore", "Central Region", "Singapore", 1.3521, 103.8198],
  ["Jakarta", "Jakarta", "Indonesia", -6.2088, 106.8456],
  ["Bangkok", "Bangkok", "Thailand", 13.7563, 100.5018],
  ["Tokyo", "Tokyo", "Japan", 35.6762, 139.6503],
  ["Osaka", "Osaka", "Japan", 34.6937, 135.5023],
  ["Seoul", "Seoul", "South Korea", 37.5665, 126.978],
  ["Hong Kong", "Hong Kong", "Hong Kong", 22.3193, 114.1694],
  ["Taipei", "Taipei", "Taiwan", 25.033, 121.5654],
  ["Sydney", "New South Wales", "Australia", -33.8688, 151.2093],
  ["Melbourne", "Victoria", "Australia", -37.8136, 144.9631],
  ["Toronto", "Ontario", "Canada", 43.6532, -79.3832],
  ["Vancouver", "British Columbia", "Canada", 49.2827, -123.1207],
  ["New York", "New York", "United States", 40.7128, -74.006],
  ["Los Angeles", "California", "United States", 34.0522, -118.2437],
  ["San Francisco", "California", "United States", 37.7749, -122.4194],
  ["Chicago", "Illinois", "United States", 41.8781, -87.6298],
  ["London", "England", "United Kingdom", 51.5074, -0.1278],
  ["Manchester", "England", "United Kingdom", 53.4808, -2.2426],
  ["Paris", "Île-de-France", "France", 48.8566, 2.3522],
  ["Rome", "Lazio", "Italy", 41.9028, 12.4964],
  ["Milan", "Lombardy", "Italy", 45.4642, 9.19],
  ["Berlin", "Berlin", "Germany", 52.52, 13.405],
  ["Madrid", "Madrid", "Spain", 40.4168, -3.7038],
  ["Amsterdam", "North Holland", "Netherlands", 52.3676, 4.9041],
  ["Oslo", "Oslo", "Norway", 59.9139, 10.7522],
  ["Stockholm", "Stockholm", "Sweden", 59.3293, 18.0686],
  ["Copenhagen", "Capital Region", "Denmark", 55.6761, 12.5683],
  ["Dublin", "Leinster", "Ireland", 53.3498, -6.2603],
  ["Auckland", "Auckland", "New Zealand", -36.8485, 174.7633],
  ["Wellington", "Wellington", "New Zealand", -41.2865, 174.7762],
];

/** Country centroids, used when only a country name is provided. */
const FOREIGN_COUNTRIES: Array<[string, string, number, number]> = [
  ["United Arab Emirates", "United Arab Emirates", 23.4241, 53.8478],
  ["Saudi Arabia", "Saudi Arabia", 23.8859, 45.0792],
  ["Qatar", "Qatar", 25.3548, 51.1839],
  ["Kuwait", "Kuwait", 29.3117, 47.4818],
  ["Bahrain", "Bahrain", 25.9304, 50.6378],
  ["Oman", "Oman", 21.4735, 55.9754],
  ["Malaysia", "Malaysia", 4.2105, 101.9758],
  ["Singapore", "Singapore", 1.3521, 103.8198],
  ["Indonesia", "Indonesia", -0.7893, 113.9213],
  ["Thailand", "Thailand", 15.87, 100.9925],
  ["Japan", "Japan", 36.2048, 138.2529],
  ["South Korea", "South Korea", 35.9078, 127.7669],
  ["Hong Kong", "Hong Kong", 22.3193, 114.1694],
  ["Taiwan", "Taiwan", 23.6978, 120.9605],
  ["Australia", "Australia", -25.2744, 133.7751],
  ["Canada", "Canada", 56.1304, -106.3468],
  ["United States", "United States", 37.0902, -95.7129],
  ["United Kingdom", "United Kingdom", 55.3781, -3.436],
  ["France", "France", 46.2276, 2.2137],
  ["Italy", "Italy", 41.8719, 12.5674],
  ["Germany", "Germany", 51.1657, 10.4515],
  ["Spain", "Spain", 40.4637, -3.7492],
  ["Netherlands", "Netherlands", 52.1326, 5.2913],
  ["Norway", "Norway", 60.472, 8.4689],
  ["Sweden", "Sweden", 60.1282, 18.6435],
  ["Denmark", "Denmark", 56.2639, 9.5018],
  ["Ireland", "Ireland", 53.1424, -7.6921],
  ["New Zealand", "New Zealand", -40.9006, 174.886],
];

const PH_REGION_CENTERS: Array<[string, number, number]> = [
  ["NCR — Metro Manila", 14.5995, 120.9842],
  ["BARMM", 7.9167, 124.3333],
  ["CAR — Cordillera", 17.0833, 121.0],
  ["MIMAROPA", 12.5667, 122.2833],
  ["Region I — Ilocos", 16.6159, 120.3209],
  ["Region II — Cagayan Valley", 17.6132, 121.727],
  ["Region III — Central Luzon", 15.0333, 120.6833],
  ["Region IV-A — CALABARZON", 14.2456, 120.8786],
  ["Region V — Bicol", 13.1916, 123.6926],
  ["Region VI — Western Visayas", 10.9167, 122.5667],
  ["Region VII — Central Visayas", 10.3167, 123.9167],
  ["Region VIII — Eastern Visayas", 11.5333, 125.4667],
  ["Region IX — Zamboanga Peninsula", 7.8333, 123.0],
  ["Region X — Northern Mindanao", 8.5833, 124.75],
  ["Region XI — Davao", 7.0, 126.3333],
  ["Region XII — SOCCSKSARGEN", 6.5, 124.5],
  ["Region XIII — Caraga", 8.5, 125.8333],
];

const PH_CITY_INDEX = new Map<string, Place>();
for (const [city, province, region, lat, lng] of PH_CITIES) {
  const key = normalize(city);
  if (!PH_CITY_INDEX.has(key)) {
    PH_CITY_INDEX.set(key, { country: "Philippines", region, city, lat, lng, precision: "city" });
  }
  // Also allow the province name in the city field (e.g. "Lanao del Sur").
  const provinceKey = normalize(province);
  if (provinceKey && !PH_CITY_INDEX.has(provinceKey)) {
    PH_CITY_INDEX.set(provinceKey, {
      country: "Philippines",
      region,
      city,
      lat,
      lng,
      precision: "state",
    });
  }
}

const PH_PROVINCE_INDEX = new Map<string, Place>();
for (const [province, region, lat, lng] of PH_PROVINCES) {
  PH_PROVINCE_INDEX.set(normalize(province), {
    country: "Philippines",
    region,
    city: province,
    lat,
    lng,
    precision: "state",
  });
}
PH_PROVINCE_INDEX.set("cdo", {
  country: "Philippines",
  region: "Region X — Northern Mindanao",
  city: "Cagayan de Oro",
  lat: 8.4542,
  lng: 124.6319,
  precision: "city",
});
PH_PROVINCE_INDEX.set("cagayan de oro", {
  country: "Philippines",
  region: "Region X — Northern Mindanao",
  city: "Cagayan de Oro",
  lat: 8.4542,
  lng: 124.6319,
  precision: "city",
});
PH_PROVINCE_INDEX.set("ncr", {
  country: "Philippines",
  region: "NCR — Metro Manila",
  city: "Metro Manila",
  lat: 14.5995,
  lng: 120.9842,
  precision: "state",
});
PH_PROVINCE_INDEX.set("bangsamoro", {
  country: "Philippines",
  region: "BARMM",
  city: "BARMM",
  lat: 7.9167,
  lng: 124.3333,
  precision: "state",
});

const FOREIGN_CITY_INDEX = new Map<string, Place>();
for (const [city, region, country, lat, lng] of FOREIGN_CITIES) {
  FOREIGN_CITY_INDEX.set(normalize(city), {
    country,
    region,
    city,
    lat,
    lng,
    precision: "state",
  });
}

const FOREIGN_COUNTRY_INDEX = new Map<string, Place>();
for (const [country, region, lat, lng] of FOREIGN_COUNTRIES) {
  FOREIGN_COUNTRY_INDEX.set(normalize(country), {
    country,
    region,
    city: country,
    lat,
    lng,
    precision: "state",
  });
}

const PH_REGION_INDEX = new Map<string, Place>();
for (const [region, lat, lng] of PH_REGION_CENTERS) {
  PH_REGION_INDEX.set(normalize(region.replace(/—.*$/, "")), {
    country: "Philippines",
    region,
    city: region,
    lat,
    lng,
    precision: "state",
  });
}

const PH_FALLBACK: Place = {
  country: "Philippines",
  region: "Philippines",
  city: "Philippines",
  lat: 12.8797,
  lng: 121.774,
  precision: "state",
};

function withLabels(
  place: Place,
  cityLabel: string,
  regionLabel: string,
  matched = true,
): ResolvedLocation {
  const city = cityLabel.trim() || place.city;
  return {
    country: place.country,
    region: regionLabel.trim() || place.region,
    city,
    precision: place.precision,
    lat: place.lat,
    lng: place.lng,
    matched,
  };
}

/**
 * Resolve a free-text city/province pair into map coordinates.
 * Returns `null` only when there is no location text at all.
 */
export function resolveLocation(
  cityInput: string | null | undefined,
  provinceInput: string | null | undefined,
): ResolvedLocation | null {
  const city = normalize(cityInput);
  const province = normalize(provinceInput);
  if (!city && !province) return null;

  // 1. Overseas city typed into either field.
  for (const key of [city, province]) {
    if (!key) continue;
    const place = FOREIGN_CITY_INDEX.get(key);
    if (place) return withLabels(place, cityInput ?? "", provinceInput ?? "");
  }

  // 2. Overseas country typed into either field.
  for (const key of [city, province]) {
    if (!key) continue;
    const place = FOREIGN_COUNTRY_INDEX.get(key);
    if (place) return withLabels(place, cityInput ?? "", provinceInput ?? "");
  }

  // 3. Philippine city or municipality.
  for (const key of [city, province]) {
    if (!key) continue;
    const place = PH_CITY_INDEX.get(key);
    if (place) return withLabels(place, cityInput ?? "", provinceInput ?? "");
  }

  // 4. Philippine province.
  for (const key of [city, province]) {
    if (!key) continue;
    const place = PH_PROVINCE_INDEX.get(key);
    if (place) return withLabels(place, cityInput ?? "", provinceInput ?? "");
  }

  // 5. Philippine region name typed into the province field.
  for (const key of [province, city]) {
    if (!key) continue;
    const place = PH_REGION_INDEX.get(key);
    if (place) return withLabels(place, cityInput ?? "", provinceInput ?? "");
  }

  // 6. Unknown Philippine address — keep the pin on the country so the record
  //    still appears on the map instead of silently disappearing.
  return withLabels(PH_FALLBACK, cityInput ?? "", provinceInput ?? "", false);
}
