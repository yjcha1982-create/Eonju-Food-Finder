const DEFAULT_RADIUS = 400;
const SAVED_LOCATION_KEY = "lunch-saved-location";
const PREFERENCES_KEY = "lunch-preferences";
const THEME_KEY = "lunch-theme";
const THEME_COLORS = {
  orange: "#ff6330",
  kakao: "#fee500",
  mint: "#16a085",
  blue: "#3478f6",
  dark: "#9d8cff",
};

const CATEGORY_META = {
  전체: { emoji: "🍽️", keywords: [] },
  "고기·구이": {
    emoji: "🥩",
    keywords: [
      "육류",
      "고기",
      "삼겹살",
      "갈비",
      "곱창",
      "막창",
      "바베큐",
      "정육",
      "불고기",
      "닭갈비",
    ],
  },
  "국밥·해장": {
    emoji: "🍲",
    keywords: [
      "국밥",
      "해장국",
      "감자탕",
      "순대국",
      "설렁탕",
      "곰탕",
      "갈비탕",
      "육개장",
    ],
  },
  "찌개·전골": {
    emoji: "🥘",
    keywords: ["찌개", "전골", "부대찌개", "김치찌개", "된장찌개", "샤브샤브"],
  },
  "국수·냉면": {
    emoji: "🍜",
    keywords: [
      "국수",
      "냉면",
      "칼국수",
      "막국수",
      "콩국수",
      "잔치국수",
      "수제비",
    ],
  },
  "분식·김밥": {
    emoji: "🍙",
    keywords: ["분식", "김밥", "떡볶이", "순대", "라볶이", "만두"],
  },
  돈까스: {
    emoji: "🍛",
    keywords: ["돈까스", "돈가스", "돈카츠", "카레"],
  },
  중식: {
    emoji: "🥟",
    keywords: ["중식", "중국", "짜장", "짬뽕", "마라", "양꼬치", "딤섬"],
  },
  "일식·라멘": {
    emoji: "🍜",
    keywords: ["라멘", "우동", "소바", "일본식라면", "일본식"],
  },
  "초밥·일식": {
    emoji: "🍣",
    keywords: ["초밥", "스시", "일식", "일본"],
  },
  "회·해산물": {
    emoji: "🐟",
    keywords: [
      "횟집",
      "생선회",
      "해산물",
      "수산물",
      "생선구이",
      "장어구이",
      "아구찜",
      "아귀찜",
      "낙지",
      "쭈꾸미",
      "주꾸미",
      "게요리",
    ],
  },
  "백반·한식": {
    emoji: "🍚",
    keywords: [
      "한식",
      "백반",
      "한정식",
      "보리밥",
      "쌈밥",
      "도시락",
      "가정식",
    ],
  },
  "양식·파스타": {
    emoji: "🍝",
    keywords: ["양식", "이탈리안", "파스타", "스테이크", "멕시칸", "브런치"],
  },
  "베트남·태국": {
    emoji: "🍜",
    keywords: [
      "베트남",
      "태국",
      "쌀국수",
      "팟타이",
      "아시아",
      "동남아",
      "인도네시아",
    ],
  },
  "인도·커리": {
    emoji: "🍛",
    keywords: ["인도음식", "인도요리", "인도커리", "난 ", "탄두리"],
  },
  치킨: {
    emoji: "🍗",
    keywords: ["치킨", "통닭", "닭강정"],
  },
  "버거·샌드위치": {
    emoji: "🍔",
    keywords: ["햄버거", "버거", "샌드위치", "토스트", "패스트푸드"],
  },
  피자: {
    emoji: "🍕",
    keywords: ["피자"],
  },
  "카페·디저트": {
    emoji: "☕",
    keywords: ["카페", "커피", "베이커리", "디저트", "제과", "제빵"],
  },
  기타: { emoji: "🥘", keywords: ["음식점", "뷔페", "푸드코트", "요리"] },
};

const CATEGORY_MATCH_ORDER = [
  "회·해산물",
  "고기·구이",
  "국밥·해장",
  "찌개·전골",
  "국수·냉면",
  "분식·김밥",
  "돈까스",
  "치킨",
  "피자",
  "버거·샌드위치",
  "중식",
  "일식·라멘",
  "초밥·일식",
  "베트남·태국",
  "인도·커리",
  "양식·파스타",
  "백반·한식",
  "카페·디저트",
];

const state = {
  restaurants: [],
  filtered: [],
  position: null,
  locationName: "",
  selectedCategories: new Set(),
  searchRadius: DEFAULT_RADIUS,
  loading: false,
  preferences: JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}"),
};

const elements = {
  addressForm: document.querySelector("#addressForm"),
  addressInput: document.querySelector("#addressInput"),
  currentLocationButton: document.querySelector("#currentLocationButton"),
  saveLocationButton: document.querySelector("#saveLocationButton"),
  locationLabel: document.querySelector("#locationLabel"),
  dataStatus: document.querySelector("#dataStatus"),
  radiusSelect: document.querySelector("#radiusSelect"),
  themeSelect: document.querySelector("#themeSelect"),
  categoryFilters: document.querySelector("#categoryFilters"),
  pickButton: document.querySelector("#pickButton"),
  pickCount: document.querySelector("#pickCount"),
  pickResult: document.querySelector("#pickResult"),
  searchInput: document.querySelector("#searchInput"),
  shuffleModes: document.querySelectorAll('input[name="shuffleMode"]'),
  sortSelect: document.querySelector("#sortSelect"),
  resultCount: document.querySelector("#resultCount"),
  emptyState: document.querySelector("#emptyState"),
  restaurantList: document.querySelector("#restaurantList"),
  toast: document.querySelector("#toast"),
};

let toastTimer;
let searchTimer;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 3000);
}

function setTheme(theme) {
  const selectedTheme = THEME_COLORS[theme] ? theme : "orange";
  document.documentElement.dataset.theme = selectedTheme;
  elements.themeSelect.value = selectedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[selectedTheme]);
  try {
    localStorage.setItem(THEME_KEY, selectedTheme);
  } catch {
    // The selected theme still applies when browser storage is unavailable.
  }
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "orange";
  } catch {
    return "orange";
  }
}

function setLoading(loading, message = "") {
  state.loading = loading;
  elements.currentLocationButton.disabled = loading;
  elements.addressForm.querySelector(".primary-button").disabled = loading;
  elements.pickButton.disabled = loading || state.filtered.length === 0;
  if (message) elements.dataStatus.textContent = message;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `카카오 API 요청 오류 (${response.status})`);
  }
  return data;
}

function classifyRestaurant(place) {
  const text = `${place.categoryPath || ""} ${place.name || ""}`.toLowerCase();
  for (const category of CATEGORY_MATCH_ORDER) {
    const meta = CATEGORY_META[category];
    if (meta.keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return place.categoryGroup === "CE7" ? "카페·디저트" : "기타";
}

async function searchAddress(query) {
  return fetchJson(
    `/api/location?action=search&query=${encodeURIComponent(query)}`,
  );
}

async function reverseGeocode(latitude, longitude) {
  const result = await fetchJson(
    `/api/location?action=reverse&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
  );
  state.locationProvider = result.provider;
  return result.name;
}

async function fetchNearbyRestaurants(
  latitude,
  longitude,
  locationName,
  query = "",
) {
  const data = await fetchJson(
    `/api/restaurants?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&radius=${state.searchRadius}&location=${encodeURIComponent(locationName)}&query=${encodeURIComponent(query)}`,
  );
  state.provider = data.provider;
  return data.restaurants.map((place) => ({
    ...place,
    category: classifyRestaurant(place),
    cuisine: place.categoryPath?.replaceAll(">", " · ") || "",
  }));
}

async function loadRestaurants(location, locationName) {
  state.position = {
    latitude: location.latitude,
    longitude: location.longitude,
  };
  state.locationName = locationName;
  elements.locationLabel.textContent = locationName;
  elements.saveLocationButton.disabled = true;
  setLoading(true, `카카오에서 ${formatRadius(state.searchRadius)} 안의 식당을 찾고 있습니다.`);

  try {
    state.restaurants = await fetchNearbyRestaurants(
      location.latitude,
      location.longitude,
      locationName,
      elements.searchInput.value.trim(),
    );
    elements.saveLocationButton.disabled = false;
    elements.dataStatus.textContent = state.restaurants.length
      ? `카카오 식당 ${state.restaurants.length}곳을 거리순으로 표시합니다.`
      : `카카오에서 ${formatRadius(state.searchRadius)} 안의 식당을 찾지 못했습니다.`;
  } catch (error) {
    state.restaurants = [];
    elements.dataStatus.textContent = error.message;
    showToast(error.message);
  } finally {
    applyFilters();
    setLoading(false);
  }
}

function requestCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("이 브라우저에서는 위치 서비스를 사용할 수 없습니다.");
    return;
  }

  setLoading(true, "현재 위치를 확인하고 있습니다.");
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const name = await reverseGeocode(coords.latitude, coords.longitude);
        await loadRestaurants(
          { latitude: coords.latitude, longitude: coords.longitude },
          name,
        );
      } catch (error) {
        elements.locationLabel.textContent = "미설정";
        setLoading(false, error.message);
        showToast(error.message);
      }
    },
    (error) => {
      const message =
        error.code === 1
          ? "위치 권한이 거부되었습니다. 주소를 직접 입력해 주세요."
          : "현재 위치를 확인하지 못했습니다. 주소를 직접 입력해 주세요.";
      elements.locationLabel.textContent = "미설정";
      setLoading(false, message);
      showToast(message);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
  );
}

function preferenceFor(id) {
  return state.preferences[id] || "neutral";
}

function setPreference(id, preference) {
  state.preferences[id] =
    preferenceFor(id) === preference ? "neutral" : preference;
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state.preferences));
  applyFilters();
  syncPreferenceButtons();
}

function applyFilters() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const compactSearch = search.replace(/\s+/g, "");
  state.filtered = state.restaurants.filter(
    (restaurant) => {
      const searchable = [
        restaurant.name,
        restaurant.category,
        restaurant.cuisine,
        restaurant.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (state.selectedCategories.size === 0 ||
          state.selectedCategories.has(restaurant.category)) &&
        (!search ||
          searchable.includes(search) ||
          searchable.replace(/\s+/g, "").includes(compactSearch))
      );
    },
  );

  if (elements.sortSelect.value === "name") {
    state.filtered.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } else if (elements.sortSelect.value === "preferred") {
    state.filtered.sort(
      (a, b) =>
        Number(preferenceFor(b.id) === "like") -
          Number(preferenceFor(a.id) === "like") ||
        a.distance - b.distance,
    );
  } else {
    state.filtered.sort((a, b) => a.distance - b.distance);
  }

  renderCategories();
  renderRestaurants();
  const candidates = getPickCandidates();
  elements.pickButton.disabled = state.loading || candidates.length === 0;
  elements.pickCount.textContent = candidates.length
    ? `${candidates.length}곳 중 무작위`
    : "선택 가능한 식당 없음";
}

function getPickCandidates() {
  const likedOnly =
    document.querySelector('input[name="shuffleMode"]:checked')?.value ===
    "liked";
  return state.filtered.filter((restaurant) =>
    likedOnly
      ? preferenceFor(restaurant.id) === "like"
      : preferenceFor(restaurant.id) !== "dislike",
  );
}

function renderCategories() {
  elements.categoryFilters.innerHTML = Object.entries(CATEGORY_META)
    .map(([category, meta]) => {
      const count =
        category === "전체"
          ? state.restaurants.length
          : state.restaurants.filter((item) => item.category === category).length;
      if (category !== "전체" && count === 0) return "";
      return `
        <button class="category-chip ${
          category === "전체"
            ? state.selectedCategories.size === 0
              ? "active"
              : ""
            : state.selectedCategories.has(category)
              ? "active"
              : ""
        }" type="button" data-category="${category}"
          aria-pressed="${
            category === "전체"
              ? state.selectedCategories.size === 0
              : state.selectedCategories.has(category)
          }">
          ${meta.emoji} ${category} <small>${count}</small>
        </button>`;
    })
    .join("");
}

function renderRestaurants() {
  elements.resultCount.textContent = state.filtered.length;
  elements.emptyState.hidden = state.filtered.length > 0;

  if (!state.filtered.length) {
    elements.restaurantList.innerHTML = "";
    elements.emptyState.querySelector("strong").textContent = state.loading
      ? "주변 식당을 찾고 있습니다."
      : state.restaurants.length
        ? "선택한 조건에 맞는 식당이 없습니다."
        : "표시할 식당 검색 결과가 없습니다.";
    return;
  }

  elements.restaurantList.innerHTML = state.filtered
    .map((restaurant) => {
      const category = CATEGORY_META[restaurant.category];
      const details = restaurant.cuisine || restaurant.address || restaurant.category;
      return `
        <article class="restaurant-row">
          <span class="distance">${restaurant.distance}m</span>
          <div class="restaurant-info">
            <strong>${category.emoji} ${escapeHtml(restaurant.name)}</strong>
            <small>${escapeHtml(details)}</small>
          </div>
          <a class="map-link" href="${mapUrl(restaurant)}" target="_blank" rel="noopener">
            ${restaurant.source === "kakao" ? "카카오맵" : "지도"}
          </a>
          <div class="preference-actions">
            ${preferenceButtons(restaurant)}
          </div>
        </article>`;
    })
    .join("");
}

function pickRestaurant() {
  const candidates = getPickCandidates();
  if (!candidates.length) return;

  elements.pickButton.disabled = true;
  elements.pickResult.classList.add("shuffling");
  let ticks = 0;
  const interval = setInterval(() => {
    const candidate =
      candidates[Math.floor(Math.random() * candidates.length)];
    elements.pickResult.innerHTML = `
      <div>
        <div class="winner-emoji">${CATEGORY_META[candidate.category].emoji}</div>
        <h3 class="winner-name">${escapeHtml(candidate.name)}</h3>
      </div>`;
    ticks += 1;

    if (ticks >= 12) {
      clearInterval(interval);
      elements.pickResult.classList.remove("shuffling");
      elements.pickButton.disabled = false;
      const winner =
        candidates[Math.floor(Math.random() * candidates.length)];
      elements.pickResult.innerHTML = `
        <div>
          <div class="winner-emoji">${CATEGORY_META[winner.category].emoji}</div>
          <p class="winner-category">${winner.category}</p>
          <h3 class="winner-name">${escapeHtml(winner.name)}</h3>
          <p class="winner-distance">${winner.distance}m · 도보권</p>
          <a class="winner-link" href="${mapUrl(winner)}" target="_blank" rel="noopener">
            카카오맵에서 보기
          </a>
          <div class="winner-preferences">
            ${preferenceButtons(winner)}
          </div>
        </div>`;
    }
  }, 80);
}

function preferenceButtons(restaurant) {
  const preference = preferenceFor(restaurant.id);
  return `
    <button class="preference-button like ${preference === "like" ? "active" : ""}"
      type="button" data-preference-id="${escapeHtml(restaurant.id)}"
      data-preference="like" aria-label="${escapeHtml(restaurant.name)} 좋아요">♥</button>
    <button class="preference-button dislike ${preference === "dislike" ? "active" : ""}"
      type="button" data-preference-id="${escapeHtml(restaurant.id)}"
      data-preference="dislike" aria-label="${escapeHtml(restaurant.name)} 싫어요">−</button>
  `;
}

function syncPreferenceButtons() {
  document.querySelectorAll("[data-preference-id]").forEach((button) => {
    button.classList.toggle(
      "active",
      preferenceFor(button.dataset.preferenceId) === button.dataset.preference,
    );
  });
}

function mapUrl(restaurant) {
  return (
    restaurant.placeUrl ||
    `https://map.kakao.com/link/search/${encodeURIComponent(restaurant.name)}`
  );
}

function formatRadius(radius) {
  return radius >= 1000 ? `${radius / 1000}km` : `${radius}m`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveCurrentLocation() {
  if (!state.position) return;
  localStorage.setItem(
    SAVED_LOCATION_KEY,
    JSON.stringify({ ...state.position, name: state.locationName }),
  );
  showToast("이 위치를 다음 접속 위치로 저장했습니다.");
}

async function initialize() {
  setTheme(getSavedTheme());
  renderCategories();
  applyFilters();

  elements.addressForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = elements.addressInput.value.trim();
    if (!query) {
      showToast("주소나 건물명을 입력해 주세요.");
      return;
    }

    setLoading(true, "카카오에서 주소를 찾고 있습니다.");
    try {
      const location = await searchAddress(query);
      state.locationProvider = location.provider;
      await loadRestaurants(location, location.name);
    } catch (error) {
      setLoading(false, error.message);
      showToast(error.message);
    }
  });

  elements.currentLocationButton.addEventListener("click", requestCurrentLocation);
  elements.saveLocationButton.addEventListener("click", saveCurrentLocation);
  elements.themeSelect.addEventListener("change", (event) => {
    setTheme(event.target.value);
  });
  elements.pickButton.addEventListener("click", pickRestaurant);
  elements.searchInput.addEventListener("input", () => {
    applyFilters();
    clearTimeout(searchTimer);
    const query = elements.searchInput.value.trim();
    if (!query || !state.position) return;
    searchTimer = setTimeout(async () => {
      setLoading(true, `"${query}" 카카오맵 검색 중입니다.`);
      try {
        state.restaurants = await fetchNearbyRestaurants(
          state.position.latitude,
          state.position.longitude,
          state.locationName,
          query,
        );
        applyFilters();
      } catch (error) {
        showToast(error.message);
      } finally {
        setLoading(false);
      }
    }, 450);
  });
  elements.shuffleModes.forEach((input) =>
    input.addEventListener("change", applyFilters),
  );
  elements.sortSelect.addEventListener("change", applyFilters);

  elements.radiusSelect.addEventListener("change", async (event) => {
    if (state.loading) return;
    state.searchRadius = Number(event.target.value);
    if (state.position) {
      await loadRestaurants(state.position, state.locationName);
    }
  });

  elements.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    const category = button.dataset.category;
    if (category === "전체") {
      state.selectedCategories.clear();
    } else if (state.selectedCategories.has(category)) {
      state.selectedCategories.delete(category);
    } else {
      state.selectedCategories.add(category);
    }
    applyFilters();
  });

  function handlePreferenceClick(event) {
    const button = event.target.closest("[data-preference-id]");
    if (!button) return;
    setPreference(button.dataset.preferenceId, button.dataset.preference);
  }

  elements.restaurantList.addEventListener("click", handlePreferenceClick);
  elements.pickResult.addEventListener("click", handlePreferenceClick);

  const saved = JSON.parse(localStorage.getItem(SAVED_LOCATION_KEY) || "null");
  if (saved?.latitude && saved?.longitude && saved?.name) {
    await loadRestaurants(saved, saved.name);
  } else {
    requestCurrentLocation();
  }
}

initialize();
