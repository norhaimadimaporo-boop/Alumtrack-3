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
  ["Makkah", "Makkah Province", "Saudi Arabia", 21.3891, 39.8579],
  ["Medina", "Al Madinah Province", "Saudi Arabia", 24.5247, 39.5692],
  ["Madinah", "Al Madinah Province", "Saudi Arabia", 24.5247, 39.5692],
  ["Al Madinah", "Al Madinah Province", "Saudi Arabia", 24.5247, 39.5692],
  ["Medinah", "Al Madinah Province", "Saudi Arabia", 24.5247, 39.5692],
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
  ["Christchurch", "Canterbury", "New Zealand", -43.5321, 172.6362],
  // China
  ["Shanghai", "Shanghai", "China", 31.2304, 121.4737],
  ["Beijing", "Beijing", "China", 39.9042, 116.4074],
  ["Shenzhen", "Guangdong", "China", 22.5431, 114.0579],
  ["Guangzhou", "Guangdong", "China", 23.1291, 113.2644],
  ["Chengdu", "Sichuan", "China", 30.5728, 104.0668],
  ["Wuhan", "Hubei", "China", 30.5928, 114.3055],
  ["Xiamen", "Fujian", "China", 24.4798, 118.0894],
  ["Hangzhou", "Zhejiang", "China", 30.2741, 120.1551],
  ["Tianjin", "Tianjin", "China", 39.3434, 117.3616],
  ["Xi'an", "Shaanxi", "China", 34.3416, 108.9398],
  ["Nanjing", "Jiangsu", "China", 32.0603, 118.7969],
  ["Qingdao", "Shandong", "China", 36.0671, 120.3826],
  ["Chongqing", "Chongqing", "China", 29.563, 106.5516],
  ["Macau", "Macau", "China", 22.1987, 113.5439],
  // Russia
  ["Moscow", "Moscow", "Russia", 55.7558, 37.6173],
  ["Saint Petersburg", "Saint Petersburg", "Russia", 59.9311, 30.3609],
  ["St Petersburg", "Saint Petersburg", "Russia", 59.9311, 30.3609],
  ["Novosibirsk", "Novosibirsk Oblast", "Russia", 55.0084, 82.9357],
  ["Yekaterinburg", "Sverdlovsk Oblast", "Russia", 56.8389, 60.6057],
  ["Vladivostok", "Primorsky Krai", "Russia", 43.1332, 131.9113],
  ["Kazan", "Tatarstan", "Russia", 55.7961, 49.1064],
  // East and Southeast Asia
  ["Kaohsiung", "Kaohsiung", "Taiwan", 22.6273, 120.3014],
  ["Taichung", "Taichung", "Taiwan", 24.1477, 120.6736],
  ["Nagoya", "Aichi", "Japan", 35.1815, 136.9066],
  ["Kyoto", "Kyoto", "Japan", 35.0116, 135.7681],
  ["Fukuoka", "Fukuoka", "Japan", 33.5902, 130.4017],
  ["Sapporo", "Hokkaido", "Japan", 43.0618, 141.3545],
  ["Yokohama", "Kanagawa", "Japan", 35.4437, 139.638],
  ["Busan", "Busan", "South Korea", 35.1796, 129.0756],
  ["Incheon", "Incheon", "South Korea", 37.4563, 126.7052],
  ["Daegu", "Daegu", "South Korea", 35.8714, 128.6014],
  ["Penang", "Penang", "Malaysia", 5.4141, 100.3288],
  ["Johor Bahru", "Johor", "Malaysia", 1.4927, 103.7414],
  ["Kota Kinabalu", "Sabah", "Malaysia", 5.9804, 116.0735],
  ["Kuching", "Sarawak", "Malaysia", 1.5533, 110.3592],
  ["Surabaya", "East Java", "Indonesia", -7.2575, 112.7521],
  ["Bandung", "West Java", "Indonesia", -6.9175, 107.6191],
  ["Denpasar", "Bali", "Indonesia", -8.6705, 115.2126],
  ["Chiang Mai", "Chiang Mai", "Thailand", 18.7883, 98.9853],
  ["Phuket", "Phuket", "Thailand", 7.8804, 98.3923],
  ["Hanoi", "Hanoi", "Vietnam", 21.0278, 105.8342],
  ["Ho Chi Minh", "Ho Chi Minh", "Vietnam", 10.8231, 106.6297],
  ["Ho Chi Minh City", "Ho Chi Minh", "Vietnam", 10.8231, 106.6297],
  ["Da Nang", "Da Nang", "Vietnam", 16.0544, 108.2022],
  // South and West Asia
  ["Mumbai", "Maharashtra", "India", 19.076, 72.8777],
  ["New Delhi", "Delhi", "India", 28.6139, 77.209],
  ["Delhi", "Delhi", "India", 28.6139, 77.209],
  ["Bangalore", "Karnataka", "India", 12.9716, 77.5946],
  ["Bengaluru", "Karnataka", "India", 12.9716, 77.5946],
  ["Chennai", "Tamil Nadu", "India", 13.0827, 80.2707],
  ["Hyderabad", "Telangana", "India", 17.385, 78.4867],
  ["Kolkata", "West Bengal", "India", 22.5726, 88.3639],
  ["Pune", "Maharashtra", "India", 18.5204, 73.8567],
  ["Karachi", "Sindh", "Pakistan", 24.8607, 67.0011],
  ["Lahore", "Punjab", "Pakistan", 31.5204, 74.3587],
  ["Islamabad", "Islamabad", "Pakistan", 33.6844, 73.0479],
  ["Dhaka", "Dhaka", "Bangladesh", 23.8103, 90.4125],
  ["Chittagong", "Chittagong", "Bangladesh", 22.3569, 91.7832],
  ["Colombo", "Western Province", "Sri Lanka", 6.9271, 79.8612],
  ["Kathmandu", "Bagmati", "Nepal", 27.7172, 85.324],
  ["Istanbul", "Istanbul", "Turkey", 41.0082, 28.9784],
  ["Ankara", "Ankara", "Turkey", 39.9334, 32.8597],
  ["Izmir", "Izmir", "Turkey", 38.4237, 27.1428],
  ["Ajman", "Ajman", "United Arab Emirates", 25.4052, 55.5136],
  ["Ras Al Khaimah", "Ras Al Khaimah", "United Arab Emirates", 25.8007, 55.9762],
  ["Fujairah", "Fujairah", "United Arab Emirates", 25.1288, 56.3265],
  ["Khobar", "Eastern Province", "Saudi Arabia", 26.2172, 50.1971],
  ["Dhahran", "Eastern Province", "Saudi Arabia", 26.2361, 50.0393],
  ["Taif", "Makkah Province", "Saudi Arabia", 21.2703, 40.4158],
  ["Al Wakrah", "Al Wakrah", "Qatar", 25.1659, 51.5976],
  ["Al Khor", "Al Khor", "Qatar", 25.6804, 51.4969],
  ["Al Ahmadi", "Al Ahmadi", "Kuwait", 29.0769, 48.0838],
  ["Hawalli", "Hawalli", "Kuwait", 29.3328, 48.0286],
  ["Riffa", "Southern Governorate", "Bahrain", 26.13, 50.555],
  ["Muharraq", "Muharraq", "Bahrain", 26.2572, 50.6119],
  ["Salalah", "Dhofar", "Oman", 17.0151, 54.0924],
  ["Sohar", "Al Batinah North", "Oman", 24.3419, 56.7094],
  // Europe
  ["Marseille", "Provence-Alpes-Cote d'Azur", "France", 43.2965, 5.3698],
  ["Lyon", "Auvergne-Rhone-Alpes", "France", 45.764, 4.8357],
  ["Nice", "Provence-Alpes-Cote d'Azur", "France", 43.7102, 7.262],
  ["Toulouse", "Occitanie", "France", 43.6047, 1.4442],
  ["Birmingham", "England", "United Kingdom", 52.4862, -1.8904],
  ["Edinburgh", "Scotland", "United Kingdom", 55.9533, -3.1883],
  ["Glasgow", "Scotland", "United Kingdom", 55.8642, -4.2518],
  ["Munich", "Bavaria", "Germany", 48.1351, 11.582],
  ["Frankfurt", "Hesse", "Germany", 50.1109, 8.6821],
  ["Hamburg", "Hamburg", "Germany", 53.5511, 9.9937],
  ["Cologne", "North Rhine-Westphalia", "Germany", 50.9375, 6.9603],
  ["Stuttgart", "Baden-Wurttemberg", "Germany", 48.7758, 9.1829],
  ["Naples", "Campania", "Italy", 40.8518, 14.2681],
  ["Turin", "Piedmont", "Italy", 45.0703, 7.6869],
  ["Florence", "Tuscany", "Italy", 43.7696, 11.2558],
  ["Venice", "Veneto", "Italy", 45.4408, 12.3155],
  ["Barcelona", "Catalonia", "Spain", 41.3874, 2.1686],
  ["Valencia", "Valencia", "Spain", 39.4699, -0.3763],
  ["Seville", "Andalusia", "Spain", 37.3891, -5.9845],
  ["Rotterdam", "South Holland", "Netherlands", 51.9244, 4.4777],
  ["The Hague", "South Holland", "Netherlands", 52.0705, 4.3007],
  ["Zurich", "Zurich", "Switzerland", 47.3769, 8.5417],
  ["Geneva", "Geneva", "Switzerland", 46.2044, 6.1432],
  ["Brussels", "Brussels", "Belgium", 50.8503, 4.3517],
  ["Vienna", "Vienna", "Austria", 48.2082, 16.3738],
  ["Lisbon", "Lisbon", "Portugal", 38.7223, -9.1393],
  ["Athens", "Attica", "Greece", 37.9838, 23.7275],
  ["Warsaw", "Masovia", "Poland", 52.2297, 21.0122],
  ["Prague", "Prague", "Czechia", 50.0755, 14.4378],
  ["Budapest", "Budapest", "Hungary", 47.4979, 19.0402],
  ["Bucharest", "Bucharest", "Romania", 44.4268, 26.1025],
  ["Kyiv", "Kyiv", "Ukraine", 50.4501, 30.5234],
  ["Kiev", "Kyiv", "Ukraine", 50.4501, 30.5234],
  ["Helsinki", "Uusimaa", "Finland", 60.1699, 24.9384],
  // Africa, Americas, Oceania
  ["Cairo", "Cairo", "Egypt", 30.0444, 31.2357],
  ["Alexandria", "Alexandria", "Egypt", 31.2001, 29.9187],
  ["Johannesburg", "Gauteng", "South Africa", -26.2041, 28.0473],
  ["Cape Town", "Western Cape", "South Africa", -33.9249, 18.4241],
  ["Durban", "KwaZulu-Natal", "South Africa", -29.8587, 31.0218],
  ["Lagos", "Lagos", "Nigeria", 6.5244, 3.3792],
  ["Abuja", "Federal Capital Territory", "Nigeria", 9.0765, 7.3986],
  ["Nairobi", "Nairobi", "Kenya", -1.2921, 36.8219],
  ["Sao Paulo", "Sao Paulo", "Brazil", -23.5505, -46.6333],
  ["Rio de Janeiro", "Rio de Janeiro", "Brazil", -22.9068, -43.1729],
  ["Brasilia", "Federal District", "Brazil", -15.7939, -47.8828],
  ["Mexico City", "Mexico City", "Mexico", 19.4326, -99.1332],
  ["Guadalajara", "Jalisco", "Mexico", 20.6597, -103.3496],
  ["Monterrey", "Nuevo Leon", "Mexico", 25.6866, -100.3161],
  ["Buenos Aires", "Buenos Aires", "Argentina", -34.6037, -58.3816],
  ["Santiago", "Santiago Metropolitan", "Chile", -33.4489, -70.6693],
  ["Montreal", "Quebec", "Canada", 45.5017, -73.5673],
  ["Calgary", "Alberta", "Canada", 51.0447, -114.0719],
  ["Ottawa", "Ontario", "Canada", 45.4215, -75.6972],
  ["Houston", "Texas", "United States", 29.7604, -95.3698],
  ["Dallas", "Texas", "United States", 32.7767, -96.797],
  ["Miami", "Florida", "United States", 25.7617, -80.1918],
  ["Seattle", "Washington", "United States", 47.6062, -122.3321],
  ["Boston", "Massachusetts", "United States", 42.3601, -71.0589],
  ["Washington", "District of Columbia", "United States", 38.9072, -77.0369],
  ["Atlanta", "Georgia", "United States", 33.749, -84.388],
  ["Las Vegas", "Nevada", "United States", 36.1699, -115.1398],
  ["San Diego", "California", "United States", 32.7157, -117.1611],
  ["Phoenix", "Arizona", "United States", 33.4484, -112.074],
  ["Philadelphia", "Pennsylvania", "United States", 39.9526, -75.1652],
  ["Brisbane", "Queensland", "Australia", -27.4698, 153.0251],
  ["Perth", "Western Australia", "Australia", -31.9505, 115.8605],
  ["Adelaide", "South Australia", "Australia", -34.9285, 138.6007],
  ["Canberra", "Australian Capital Territory", "Australia", -35.2809, 149.13],
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
  ["China", "China", 35.8617, 104.1954],
  ["Russia", "Russia", 61.524, 105.3188],
  ["India", "India", 20.5937, 78.9629],
  ["Pakistan", "Pakistan", 30.3753, 69.3451],
  ["Bangladesh", "Bangladesh", 23.685, 90.3563],
  ["Sri Lanka", "Sri Lanka", 7.8731, 80.7718],
  ["Nepal", "Nepal", 28.3949, 84.124],
  ["Turkey", "Turkey", 38.9637, 35.2433],
  ["Egypt", "Egypt", 26.8206, 30.8025],
  ["South Africa", "South Africa", -30.5595, 22.9375],
  ["Nigeria", "Nigeria", 9.082, 8.6753],
  ["Kenya", "Kenya", -0.0236, 37.9062],
  ["Brazil", "Brazil", -14.235, -51.9253],
  ["Mexico", "Mexico", 23.6345, -102.5528],
  ["Argentina", "Argentina", -38.4161, -63.6167],
  ["Chile", "Chile", -35.6751, -71.543],
  ["Vietnam", "Vietnam", 14.0583, 108.2772],
  ["Switzerland", "Switzerland", 46.8182, 8.2275],
  ["Belgium", "Belgium", 50.5039, 4.4699],
  ["Austria", "Austria", 47.5162, 14.5501],
  ["Portugal", "Portugal", 39.3999, -8.2245],
  ["Greece", "Greece", 39.0742, 21.8243],
  ["Poland", "Poland", 51.9194, 19.1451],
  ["Czechia", "Czechia", 49.8175, 15.473],
  ["Czech Republic", "Czechia", 49.8175, 15.473],
  ["Hungary", "Hungary", 47.1625, 19.5033],
  ["Romania", "Romania", 45.9432, 24.9668],
  ["Ukraine", "Ukraine", 48.3794, 31.1656],
  ["Finland", "Finland", 61.9241, 25.7482],
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
 * Gazetteer indexes in lookup order. Overseas entries come first so a city such
 * as "Shanghai" resolves to China even when the country name is missing.
 */
const EXACT_INDEXES: Array<{ rank: number; index: Map<string, Place> }> = [
  { rank: 0, index: FOREIGN_CITY_INDEX },
  { rank: 1, index: FOREIGN_COUNTRY_INDEX },
  { rank: 2, index: PH_CITY_INDEX },
  { rank: 3, index: PH_PROVINCE_INDEX },
  { rank: 4, index: PH_REGION_INDEX },
];

/**
 * Flattened gazetteer used to spot a known place inside a longer address
 * segment ("Pudong New Area Shanghai 200000"). Longest names are tried first.
 */
const PLACE_SEARCH: Array<{ key: string; place: Place; rank: number }> = (() => {
  const seen = new Set<string>();
  const entries: Array<{ key: string; place: Place; rank: number }> = [];

  for (const { rank, index } of EXACT_INDEXES) {
    for (const [key, place] of index) {
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ key, place, rank });
    }
  }

  return entries.sort((a, b) => b.key.length - a.key.length || a.rank - b.rank);
})();

/**
 * Overseas postal codes. Philippine ZIP codes are four digits, so anything
 * longer (or in a foreign format) means the address is not local.
 */
const INTERNATIONAL_POSTAL_PATTERNS: RegExp[] = [
  /\b\d{5,6}\b/, // China, USA, Germany, France, Russia, India, ...
  /\b\d{3}-\d{4}\b/, // Japan
  /\b\d{4}\s?[A-Z]{2}\b/, // Netherlands
  /\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i, // Canada
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i, // United Kingdom
];

function splitAddress(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;|/\r\n]+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function phraseIncludes(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function hasInternationalPostalCode(text: string): boolean {
  return INTERNATIONAL_POSTAL_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Find the most specific gazetteer entry mentioned inside any of the address
 * segments. Longer names win so "San Fernando" beats a chance "Fernando" word.
 */
function findPlaceInSegments(
  segments: string[],
  accept: (rank: number) => boolean,
): { place: Place; segment: string } | null {
  let best: { place: Place; segment: string; length: number; rank: number } | null = null;

  for (const segment of segments) {
    const haystack = normalize(segment);
    if (!haystack) continue;

    for (const entry of PLACE_SEARCH) {
      if (!accept(entry.rank) || !phraseIncludes(haystack, entry.key)) continue;

      const better =
        !best ||
        entry.key.length > best.length ||
        (entry.key.length === best.length && entry.rank < best.rank);

      if (better) {
        best = { place: entry.place, segment, length: entry.key.length, rank: entry.rank };
      }
    }
  }

  return best ? { place: best.place, segment: best.segment } : null;
}

/**
 * Resolve a free-text city/province pair into map coordinates.
 *
 * Splits the inputs on commas so full addresses ("123 Huaihai Rd, Shanghai
 * 200000, China") resolve even without an explicit country name. Returns
 * `null` when there is no location text at all, or when the text looks like an
 * unrecognized overseas address — plotting those on the Philippines would be
 * worse than leaving the profile off the map.
 */
export function resolveLocation(
  cityInput: string | null | undefined,
  provinceInput: string | null | undefined,
): ResolvedLocation | null {
  const cityParts = splitAddress(cityInput);
  const provinceParts = splitAddress(provinceInput);
  const segments = [...cityParts, ...provinceParts];
  const rawText = [cityInput, provinceInput]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(", ");

  if (segments.length === 0) {
    if (!rawText) return null;
    segments.push(rawText);
  }

  // 1. Exact gazetteer lookups. Overseas names are checked before Philippine
  //    ones, so "Shanghai" wins without needing "China" in the address.
  for (const segment of segments) {
    const key = normalize(segment);
    if (!key) continue;

    for (const { index } of EXACT_INDEXES) {
      const place = index.get(key);
      if (place) return withLabels(place, segment, "");
    }
  }

  // 2. Overseas city/country mentioned inside a longer segment.
  const overseas = findPlaceInSegments(segments, (rank) => rank <= 1);
  if (overseas) return withLabels(overseas.place, "", "");

  // 3. Unknown overseas address — do not fall back to Philippine coordinates.
  if (hasInternationalPostalCode(rawText)) return null;

  // 4. Philippine place mentioned inside a longer segment.
  const local = findPlaceInSegments(segments, () => true);
  if (local) return withLabels(local.place, "", "");

  // 5. Unknown Philippine address — keep the pin on the country so the record
  //    still appears on the map instead of silently disappearing.
  return withLabels(PH_FALLBACK, cityParts[0] ?? cityInput ?? "", provinceParts[0] ?? "", false);
}

/** Valid latitude/longitude or null; out-of-range values from a bad request are dropped. */
function validCoordinate(value: number | null | undefined, limit: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

/**
 * Location to store for an address. Coordinates chosen from the Country →
 * Province → City dropdowns are used as-is so the map pin lands on the exact
 * place; a typed place falls back to the offline gazetteer.
 */
export function savedLocation(address: {
  country: string;
  city: string;
  province: string;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}): { country: string | null; lat: number | null; lng: number | null } {
  const country = address.country.trim() || null;
  const lat = validCoordinate(address.latitude, 90);
  const lng = validCoordinate(address.longitude, 180);
  if (lat !== null && lng !== null) return { country, lat, lng };

  const location = resolveLocation(address.city, address.province);
  return {
    country: country ?? location?.country ?? null,
    lat: location?.lat ?? null,
    lng: location?.lng ?? null,
  };
}
