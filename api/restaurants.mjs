import kakaoLocal from "../lib/kakao-local.js";
import openStreetMap from "../lib/openstreetmap.js";

const { fetchKakaoRestaurants } = kakaoLocal;
const { fetchOpenStreetMapRestaurants } = openStreetMap;

export const maxDuration = 30;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const latitude = Number(url.searchParams.get("lat"));
    const longitude = Number(url.searchParams.get("lon"));
    const radius = Math.min(
      500,
      Math.max(100, Number(url.searchParams.get("radius") || 500)),
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return Response.json(
        { error: "lat and lon are required" },
        { status: 400 },
      );
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

      return Response.json(
        {
          provider: hasKakaoKey ? "kakao" : "openstreetmap",
          restaurants,
        },
        {
          headers: {
            "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
          },
        },
      );
    } catch (error) {
      console.error("restaurant search failed", error);
      return Response.json(
        { error: error?.message || "restaurant search failed" },
        { status: error?.statusCode || 500 },
      );
    }
  },
};
