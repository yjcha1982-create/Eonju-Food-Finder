import kakaoLocal from "../lib/kakao-local.js";
import openStreetMap from "../lib/openstreetmap.js";

const { geocodeAddress, reverseGeocode } = kakaoLocal;
const {
  geocodeAddress: geocodeOpenStreetMap,
  reverseGeocode: reverseOpenStreetMap,
} = openStreetMap;

export const maxDuration = 30;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";
    const apiKey = process.env.KAKAO_REST_API_KEY;
    const hasKakaoKey = Boolean(apiKey);

    try {
      if (action === "search") {
        const query = (url.searchParams.get("query") || "").trim();
        if (!query) {
          return Response.json(
            { error: "query is required" },
            { status: 400 },
          );
        }

        const result = hasKakaoKey
          ? await geocodeAddress(query, apiKey)
          : await geocodeOpenStreetMap(query);
        return Response.json({
          ...result,
          provider: hasKakaoKey ? "kakao" : "openstreetmap",
        });
      }

      if (action === "reverse") {
        const latitude = Number(url.searchParams.get("lat"));
        const longitude = Number(url.searchParams.get("lon"));
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return Response.json(
            { error: "lat and lon are required" },
            { status: 400 },
          );
        }

        const name = hasKakaoKey
          ? await reverseGeocode(latitude, longitude, apiKey)
          : await reverseOpenStreetMap(latitude, longitude);
        return Response.json({
          name,
          provider: hasKakaoKey ? "kakao" : "openstreetmap",
        });
      }

      return Response.json({ error: "invalid action" }, { status: 400 });
    } catch (error) {
      console.error("location lookup failed", error);
      return Response.json(
        { error: error?.message || "location lookup failed" },
        { status: error?.statusCode || 500 },
      );
    }
  },
};
