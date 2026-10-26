export interface IndianCity {
  name: string;
  state: string;
  tier: 1 | 2;
  lat: number;
  lng: number;
}

export const POPULAR_INDIAN_CITIES: IndianCity[] = [
  { name: 'Delhi NCR', state: 'Delhi', tier: 1, lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai', state: 'Maharashtra', tier: 1, lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', tier: 1, lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', state: 'Telangana', tier: 1, lat: 17.3850, lng: 78.4867 },
  { name: 'Ahmedabad', state: 'Gujarat', tier: 1, lat: 23.0225, lng: 72.5714 },
  { name: 'Chennai', state: 'Tamil Nadu', tier: 1, lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', tier: 1, lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', tier: 1, lat: 18.5204, lng: 73.8567 },
  { name: 'Jaipur', state: 'Rajasthan', tier: 2, lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', tier: 2, lat: 26.8467, lng: 80.9462 },
  { name: 'Surat', state: 'Gujarat', tier: 2, lat: 21.1702, lng: 72.8311 },
  { name: 'Chandigarh', state: 'Punjab', tier: 2, lat: 30.7333, lng: 76.7794 },
  { name: 'Indore', state: 'Madhya Pradesh', tier: 2, lat: 22.7196, lng: 75.8577 },
  { name: 'Nagpur', state: 'Maharashtra', tier: 2, lat: 21.1458, lng: 79.0882 },
  { name: 'Patna', state: 'Bihar', tier: 2, lat: 25.5941, lng: 85.1376 },
  { name: 'Bhopal', state: 'Madhya Pradesh', tier: 2, lat: 23.2599, lng: 77.4126 },
  { name: 'Kochi', state: 'Kerala', tier: 2, lat: 9.9312, lng: 76.2673 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', tier: 2, lat: 17.6868, lng: 83.2185 },
  { name: 'Guwahati', state: 'Assam', tier: 2, lat: 26.1445, lng: 91.7362 },
  { name: 'Dehradun', state: 'Uttarakhand', tier: 2, lat: 30.3165, lng: 78.0322 },
  { name: 'Other / International', state: 'Global', tier: 2, lat: 0, lng: 0 }
];

/**
 * Calculate distance in km between two lat/lng coordinates (Haversine formula)
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Find nearest Indian city from user coordinates (without exposing exact GPS coordinates)
 */
export function getNearestCity(lat: number, lng: number): IndianCity {
  let nearest = POPULAR_INDIAN_CITIES[0];
  let minDistance = Infinity;

  for (const city of POPULAR_INDIAN_CITIES) {
    if (city.name === 'Other / International') continue;
    const distance = calculateDistanceKm(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}
