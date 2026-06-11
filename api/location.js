const { geocodeAddress, reverseGeocode } = require("../lib/kakao-local");
const {
  geocodeAddress: geocodeOpenStreetMap,
  reverseGeocode: reverseOpenStreetMap,
} = require("../lib/openstreetmap");

module.exports = async function handler(request, response) {
  const action = String(request.query.action || "");
  const apiKey = process.env.KAKAO_REST_API_KEY;
  const hasKakaoKey = Boolean(apiKey);

  try {
    if (action === "search") {
      const query = String(request.query.query || "").trim();
      if (!query) {
        response.status(400).json({ error: "query is required" });
        return;
      }
      const result = hasKakaoKey
        ? await geocodeAddress(query, apiKey)
        : await geocodeOpenStreetMap(query);
      response.status(200).json({
        ...result,
        provider: hasKakaoKey ? "kakao" : "openstreetmap",
      });
      return;
    }

    if (action === "reverse") {
      const latitude = Number(request.query.lat);
      const longitude = Number(request.query.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        response.status(400).json({ error: "lat and lon are required" });
        return;
      }
      const name = hasKakaoKey
        ? await reverseGeocode(latitude, longitude, apiKey)
        : await reverseOpenStreetMap(latitude, longitude);
      response.status(200).json({
        name,
        provider: hasKakaoKey ? "kakao" : "openstreetmap",
      });
      return;
    }

    response.status(400).json({ error: "invalid action" });
  } catch (error) {
    response.status(error.statusCode || 500).json({ error: error.message });
  }
};
