const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  fetchKakaoRestaurants,
  geocodeAddress,
  reverseGeocode,
} = require("./lib/kakao-local");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 8000);
const root = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": body.length,
    "Cache-Control": "no-store",
  });
  response.end(body);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/restaurants") {
    const latitude = Number(requestUrl.searchParams.get("lat"));
    const longitude = Number(requestUrl.searchParams.get("lon"));
    const locationName = requestUrl.searchParams.get("location") || "";
    const query = (requestUrl.searchParams.get("query") || "").trim();
    const radius = Math.min(
      1000,
      Math.max(100, Number(requestUrl.searchParams.get("radius") || 500)),
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      sendJson(response, 400, { error: "lat and lon are required" });
      return;
    }

    try {
      const restaurants = await fetchKakaoRestaurants({
        latitude,
        longitude,
        radius,
        query,
        apiKey: process.env.KAKAO_REST_API_KEY,
      });
      sendJson(response, 200, {
        provider: "kakao",
        restaurants,
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message });
    }
    return;
  }

  if (requestUrl.pathname === "/api/location") {
    const action = requestUrl.searchParams.get("action") || "";
    try {
      if (action === "search") {
        const query = requestUrl.searchParams.get("query") || "";
        const result = await geocodeAddress(
          query,
          process.env.KAKAO_REST_API_KEY,
        );
        sendJson(response, 200, {
          ...result,
          provider: "kakao",
        });
        return;
      }
      if (action === "reverse") {
        const latitude = Number(requestUrl.searchParams.get("lat"));
        const longitude = Number(requestUrl.searchParams.get("lon"));
        const name = await reverseGeocode(
          latitude,
          longitude,
          process.env.KAKAO_REST_API_KEY,
        );
        sendJson(response, 200, {
          name,
          provider: "kakao",
        });
        return;
      }
      sendJson(response, 400, { error: "invalid action" });
    } catch (error) {
      sendJson(response, error.statusCode || 500, { error: error.message });
    }
    return;
  }

  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const contentType =
      contentTypes[path.extname(filePath).toLowerCase()] ||
      "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`Lunch Picker: http://${host}:${port}`);
});
