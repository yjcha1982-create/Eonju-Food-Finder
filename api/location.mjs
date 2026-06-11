import kakaoLocal from "../lib/kakao-local.js";

const { geocodeAddress, reverseGeocode } = kakaoLocal;

export const maxDuration = 30;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "";
    const apiKey = process.env.KAKAO_REST_API_KEY;

    try {
      if (action === "search") {
        const query = (url.searchParams.get("query") || "").trim();
        if (!query) {
          return Response.json(
            { error: "query is required" },
            { status: 400 },
          );
        }

        const result = await geocodeAddress(query, apiKey);
        return Response.json({
          ...result,
          provider: "kakao",
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

        const name = await reverseGeocode(latitude, longitude, apiKey);
        return Response.json({
          name,
          provider: "kakao",
        });
      }

      return Response.json({ error: "invalid action" }, { status: 400 });
    } catch (error) {
      console.error("location lookup failed", error);
      const configuredKey = process.env.KAKAO_REST_API_KEY || "";
      return Response.json(
        {
          error: error?.message || "location lookup failed",
          kakaoCode: error?.kakaoCode,
          keyConfigured: Boolean(configuredKey),
          keyLength: configuredKey.length,
          keyHint: configuredKey
            ? `${configuredKey.slice(0, 4)}...${configuredKey.slice(-4)}`
            : null,
        },
        { status: error?.statusCode || 500 },
      );
    }
  },
};
