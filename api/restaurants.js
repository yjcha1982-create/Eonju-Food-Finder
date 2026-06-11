const { fetchKakaoRestaurants } = require("../lib/kakao-local");
const {
  fetchOpenStreetMapRestaurants,
} = require("../lib/openstreetmap");

module.exports = async function handler(request, response) {
  const latitude = Number(request.query.lat);
  const longitude = Number(request.query.lon);
  const radius = Math.min(500, Math.max(100, Number(request.query.radius || 500)));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    response.status(400).json({ error: "lat and lon are required" });
    return;
  }

  try {
    const hasKakaoKey = Boolean(process.env.KAKAO_REST_API_KEY);
    const restaurants = hasKakaoKey
      ? await fetchKakaoRestaurants({
          latitude,
          longitude,
          radius,
          apiKey: process.env.KAKAO_REST_API_KEY,
        })
      : await fetchOpenStreetMapRestaurants({
          latitude,
          longitude,
          radius,
        });
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    response.status(200).json({
      provider: hasKakaoKey ? "kakao" : "openstreetmap",
      restaurants,
    });
  } catch (error) {
    response.status(error.statusCode || 500).json({ error: error.message });
  }
};
