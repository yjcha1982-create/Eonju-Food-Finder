const CATEGORY_CODES = ["FD6", "CE7"];

function requireApiKey(apiKey) {
  if (!apiKey) {
    const error = new Error("카카오 REST API 키가 설정되지 않았습니다.");
    error.statusCode = 503;
    throw error;
  }
}

async function kakaoGet(path, params, apiKey) {
  requireApiKey(apiKey);
  const url = new URL(`https://dapi.kakao.com${path}`);
  url.search = new URLSearchParams(params);
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${apiKey}` },
  });
  if (!response.ok) {
    const error = new Error(`카카오 Local API 오류 (${response.status})`);
    error.statusCode = response.status;
    throw error;
  }
  return response.json();
}

async function fetchKakaoRestaurants({
  latitude,
  longitude,
  radius = 500,
  apiKey,
}) {
  const results = [];
  for (const categoryCode of CATEGORY_CODES) {
    for (let page = 1; page <= 3; page += 1) {
      const data = await kakaoGet(
        "/v2/local/search/category.json",
        {
          category_group_code: categoryCode,
          x: String(longitude),
          y: String(latitude),
          radius: String(radius),
          sort: "distance",
          size: "15",
          page: String(page),
        },
        apiKey,
      );
      results.push(...data.documents);
      if (data.meta.is_end) break;
    }
  }

  const seen = new Set();
  return results
    .filter((place) => {
      if (!place.id || seen.has(place.id)) return false;
      seen.add(place.id);
      return true;
    })
    .map((place) => ({
      id: `kakao-${place.id}`,
      source: "kakao",
      name: place.place_name,
      categoryPath: place.category_name,
      categoryGroup: place.category_group_code,
      address: place.road_address_name || place.address_name,
      phone: place.phone,
      lat: Number(place.y),
      lon: Number(place.x),
      distance: Number(place.distance),
      placeUrl: place.place_url,
    }))
    .filter((place) => place.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
}

async function geocodeAddress(query, apiKey) {
  let data = await kakaoGet(
    "/v2/local/search/address.json",
    { query, size: "1" },
    apiKey,
  );

  if (!data.documents.length) {
    data = await kakaoGet(
      "/v2/local/search/keyword.json",
      { query, size: "1" },
      apiKey,
    );
  }

  const result = data.documents[0];
  if (!result) {
    const error = new Error("입력한 주소나 장소를 카카오에서 찾지 못했습니다.");
    error.statusCode = 404;
    throw error;
  }

  return {
    latitude: Number(result.y),
    longitude: Number(result.x),
    name:
      result.place_name ||
      result.road_address?.address_name ||
      result.address_name ||
      query,
  };
}

async function reverseGeocode(latitude, longitude, apiKey) {
  const data = await kakaoGet(
    "/v2/local/geo/coord2address.json",
    {
      x: String(longitude),
      y: String(latitude),
      input_coord: "WGS84",
    },
    apiKey,
  );
  const result = data.documents[0];
  if (!result) return "현재 위치";
  return (
    result.road_address?.address_name ||
    result.address?.address_name ||
    "현재 위치"
  );
}

module.exports = {
  fetchKakaoRestaurants,
  geocodeAddress,
  reverseGeocode,
};
