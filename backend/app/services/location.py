import requests
import urllib3
import math

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Mock databases of hospitals for standard cities in case Nominatim is slow or offline
MOCK_HOSPITALS = {
    "bengaluru": [
        {"name": "Bangalore Medical College and Research Institute (Dermatology)", "distance": "2.4 km", "rating": "4.2", "phone": "+91 80 2670 1150", "lat": 12.9592, "lon": 77.5744},
        {"name": "Victoria Hospital Dermatology Department", "distance": "2.5 km", "rating": "4.1", "phone": "+91 80 2670 1150", "lat": 12.9632, "lon": 77.5739},
        {"name": "St. John's Medical College Hospital (Dermatology Unit)", "distance": "5.1 km", "rating": "4.5", "phone": "+91 80 2206 5000", "lat": 12.9333, "lon": 77.6244},
        {"name": "Fortis Hospital Bannerghatta Road (Skin Care)", "distance": "7.8 km", "rating": "4.3", "phone": "+91 96633 00000", "lat": 12.8943, "lon": 77.5976},
        {"name": "Manipal Hospital Old Airport Road (Dermatology)", "distance": "6.2 km", "rating": "4.6", "phone": "+91 80 2502 4444", "lat": 12.9593, "lon": 77.6444}
    ],
    "mysore": [
        {"name": "Mysore Medical College & Research Institute (Dermatology)", "distance": "1.2 km", "rating": "4.3", "phone": "+91 821 252 0512", "lat": 12.3164, "lon": 76.6502},
        {"name": "Apollo BGS Hospitals Mysore (Skin & Cosmetology)", "distance": "3.1 km", "rating": "4.4", "phone": "+91 821 256 8888", "lat": 12.3021, "lon": 76.6215},
        {"name": "JSS Hospital Dermatology Department", "distance": "2.0 km", "rating": "4.2", "phone": "+91 821 233 5555", "lat": 12.3005, "lon": 76.6622},
        {"name": "Columbia Asia Hospital Mysore (Dermatology Clinic)", "distance": "4.8 km", "rating": "4.5", "phone": "+91 821 398 9896", "lat": 12.3488, "lon": 76.6582}
    ],
    "mangalore": [
        {"name": "Kasturba Medical College (KMC) Hospital Dermatology", "distance": "1.5 km", "rating": "4.4", "phone": "+91 824 244 5858", "lat": 12.8732, "lon": 74.8423},
        {"name": "Father Muller Medical College Hospital", "distance": "2.8 km", "rating": "4.3", "phone": "+91 824 223 8000", "lat": 12.8682, "lon": 74.8561},
        {"name": "A.J. Hospital & Research Centre (Skin Department)", "distance": "3.5 km", "rating": "4.2", "phone": "+91 824 222 5533", "lat": 12.9015, "lon": 74.8398},
        {"name": "Yenepoya Specialty Hospital Dermatology Clinic", "distance": "2.1 km", "rating": "4.1", "phone": "+91 824 423 8855", "lat": 12.8631, "lon": 74.8465}
    ],
    "delhi": [
        {"name": "AIIMS Department of Dermatology and Venereology", "distance": "0.8 km", "rating": "4.6", "phone": "+91 11 2658 8500", "lat": 28.5672, "lon": 77.2100},
        {"name": "Safdarjung Hospital Dermatology Ward", "distance": "1.1 km", "rating": "4.2", "phone": "+91 11 2616 5072", "lat": 28.5684, "lon": 77.2065},
        {"name": "Sir Ganga Ram Hospital (Skin Clinic)", "distance": "4.5 km", "rating": "4.4", "phone": "+91 11 2575 7575", "lat": 28.6385, "lon": 77.1895},
        {"name": "Max Super Speciality Hospital Saket (Dermatology)", "distance": "5.3 km", "rating": "4.5", "phone": "+91 11 2651 5050", "lat": 28.5284, "lon": 77.2132}
    ],
    "mumbai": [
        {"name": "KEM Hospital Dermatology Department", "distance": "1.8 km", "rating": "4.3", "phone": "+91 22 2410 7000", "lat": 19.0028, "lon": 72.8423},
        {"name": "Kokilaben Dhirubhai Ambani Hospital (Dermatology)", "distance": "8.5 km", "rating": "4.6", "phone": "+91 22 3099 9999", "lat": 19.1311, "lon": 72.8256},
        {"name": "Lilavati Hospital & Research Centre (Skin Specialist)", "distance": "4.2 km", "rating": "4.5", "phone": "+91 22 2675 1000", "lat": 19.0505, "lon": 72.8282},
        {"name": "Tata Memorial Hospital Skin Care Clinic", "distance": "2.1 km", "rating": "4.4", "phone": "+91 22 2417 7000", "lat": 19.0045, "lon": 72.8432}
    ],
    "hyderabad": [
        {"name": "Nizam's Institute of Medical Sciences (NIMS) Dermatology", "distance": "1.2 km", "rating": "4.3", "phone": "+91 40 2348 9000", "lat": 17.4223, "lon": 78.4562},
        {"name": "Apollo Hospitals Jubilee Hills (Skin Unit)", "distance": "4.7 km", "rating": "4.6", "phone": "+91 40 2360 7777", "lat": 17.4162, "lon": 78.4110},
        {"name": "Yashoda Hospitals Secunderabad (Dermatology)", "distance": "5.1 km", "rating": "4.4", "phone": "+91 40 2771 3333", "lat": 17.4418, "lon": 78.5015},
        {"name": "Continental Hospitals Gachibowli (Dermatology Clinic)", "distance": "9.3 km", "rating": "4.5", "phone": "+91 40 6700 0000", "lat": 17.4208, "lon": 78.3392}
    ]
}

def calculate_distance(lat1, lon1, lat2, lon2):
    """Haversine formula to compute distance in km."""
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_coordinates_from_city(city_name: str):
    """Uses Nominatim API to get lat/lon for a city name."""
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={city_name}&format=json&limit=1"
        headers = {'User-Agent': 'AISkinDiseaseDetectionSystemProject/1.0'}
        resp = requests.get(url, headers=headers, verify=False, timeout=1.5)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Nominatim lookup failed: {e}")
    return None

def find_nearby_dermatologists(lat: float, lon: float, city_hint: str = None):
    """
    Finds nearby dermatology clinics/hospitals using OpenStreetMap Overpass API.
    Falls back to mock list if offline or API error.
    """
    if lat is None or lon is None:
        if city_hint:
            resolved = get_coordinates_from_city(city_hint)
            if resolved:
                lat, lon = resolved
        if lat is None or lon is None:
            lat, lon = 12.9716, 77.5946

    # 1. Check if the city hint matches our mock database
    if city_hint:
        city_key = city_hint.strip().lower()
        if city_key in MOCK_HOSPITALS:
            # Add calculated distance based on coordinates if available
            hospitals = []
            for h in MOCK_HOSPITALS[city_key]:
                dist = calculate_distance(lat, lon, h["lat"], h["lon"])
                h_copy = h.copy()
                h_copy["distance"] = f"{dist:.2f} km"
                hospitals.append(h_copy)
            return sorted(hospitals, key=lambda x: float(x["distance"].split()[0]))
            
    # 2. Try querying OSM Overpass API
    try:
        overpass_url = "https://overpass-api.de/api/interpreter"
        # Search radius = 10km (10000m)
        overpass_query = f"""
        [out:json][timeout:2];
        (
          node["amenity"="hospital"](around:10000, {lat}, {lon});
          way["amenity"="hospital"](around:10000, {lat}, {lon});
          node["healthcare"="clinic"](around:10000, {lat}, {lon});
          node["healthcare"="doctor"](around:10000, {lat}, {lon});
        );
        out center;
        """
        resp = requests.post(overpass_url, data={'data': overpass_query}, verify=False, timeout=1.5)
        
        if resp.status_code == 200:
            elements = resp.json().get("elements", [])
            hospitals = []
            
            for elem in elements:
                tags = elem.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue
                    
                # Calculate distance
                center = elem.get("center", {})
                elem_lat = center.get("lat", elem.get("lat"))
                elem_lon = center.get("lon", elem.get("lon"))
                if not elem_lat or not elem_lon:
                    continue
                    
                dist = calculate_distance(lat, lon, elem_lat, elem_lon)
                
                # Check for phone, website, etc.
                phone = tags.get("phone", tags.get("contact:phone", "N/A"))
                rating = tags.get("rating", "4.3") # Default mock rating since OSM ratings are rarely filled
                
                hospitals.append({
                    "name": name,
                    "distance": f"{dist:.2f} km",
                    "rating": rating,
                    "phone": phone,
                    "lat": elem_lat,
                    "lon": elem_lon
                })
                
            # Filter and sort by distance
            hospitals = sorted(hospitals, key=lambda x: float(x["distance"].split()[0]))
            
            # Return top 5 hospitals
            if len(hospitals) >= 2:
                return hospitals[:5]
                
    except Exception as e:
        print(f"OSM Overpass query failed: {e}")
        
    # 3. Ultimate Fallback: Return a generic list of dermatology clinics for Bengaluru
    # or calculate distances from a generic list of landmarks
    fallback_city = city_hint.strip().lower() if city_hint else "bengaluru"
    if fallback_city not in MOCK_HOSPITALS:
        fallback_city = "bengaluru"
        
    hospitals = []
    for h in MOCK_HOSPITALS[fallback_city]:
        dist = calculate_distance(lat, lon, h["lat"], h["lon"])
        h_copy = h.copy()
        h_copy["distance"] = f"{dist:.2f} km"
        hospitals.append(h_copy)
        
    return sorted(hospitals, key=lambda x: float(x["distance"].split()[0]))
