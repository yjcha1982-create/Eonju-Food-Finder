const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOpenStreetMapRestaurants({
  latitude,
  longitude,
  radius = 500,
}) {
  const query = `
    [out:json][timeout:20];
    nwr["amenity"~"restaurant|fast_food|cafe|food_court"]
      (around:${radius},${latitude},${longitude});
    out center;
  `;

  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "LunchPicker/1.0" },
      });
      if (!response.ok) throw new Error(`OpenStreetMap 오류 (${response.status})`);
      const data = await response.json();
      const seen = new Set();
      return data.elements
        .map((item) => {
          const lat = item.lat ?? item.center?.lat;
          const lon = item.lon ?? item.center?.lon;
          const tags = item.tags || {};
          const name = tags["name:ko"] || tags.name;
          if (!lat || !lon || !name) return null;

          const key = `${name}-${lat.toFixed(4)}-${lon.toFixed(4)}`;
          if (seen.has(key)) return null;
          seen.add(key);

          return {
            id: `osm-${item.type}-${item.id}`,
            source: "openstreetmap",
            name,
            categoryPath: [tags.amenity, tags.cuisine]
              .filter(Boolean)
              .join(" > "),
            categoryGroup: tags.amenity === "cafe" ? "CE7" : "FD6",
            address: [
              tags["addr:city"],
              tags["addr:street"],
              tags["addr:housenumber"],
            ]
              .filter(Boolean)
              .join(" "),
            phone: tags.phone || "",
            lat,
            lon,
            distance: Math.round(
              distanceInMeters(latitude, longitude, lat, lon),
            ),
            placeUrl: `https://www.openstreetmap.org/${item.type}/${item.id}`,
          };
        })
        .filter((place) => place && place.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError || new Error("OpenStreetMap 검색에 실패했습니다.");
}

async function nominatim(path, params) {
  const url = new URL(`https://nominatim.openstreetmap.org${path}`);
  url.search = new URLSearchParams(params);
  const response = await fetch(url, {
    headers: { "User-Agent": "LunchPicker/1.0" },
  });
  if (!response.ok) {
    throw new Error(`OpenStreetMap 주소 검색 오류 (${response.status})`);
  }
  return response.json();
}

async function geocodeAddress(query) {
  const data = await nominatim("/search", {
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "kr",
    "accept-language": "ko",
  });
  const result = data[0];
  if (!result) {
    const error = new Error("입력한 주소나 장소를 찾지 못했습니다.");
    error.statusCode = 404;
    throw error;
  }
  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    name: result.display_name,
  };
}

async function reverseGeocode(latitude, longitude) {
  const data = await nominatim("/reverse", {
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "18",
    "accept-language": "ko",
  });
  return data.display_name || "현재 위치";
}

module.exports = {
  fetchOpenStreetMapRestaurants,
  geocodeAddress,
  reverseGeocode,
};
