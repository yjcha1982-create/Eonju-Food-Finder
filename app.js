const DEFAULT_RADIUS = 400;
const SAVED_LOCATION_KEY = "lunch-saved-location";
const PREFERENCES_KEY = "lunch-preferences";

const CATEGORY_META = {
  전체: { emoji: "🍽️", keywords: [] },
  고기구이: { emoji: "🥩", keywords: ["육류", "고기", "삼겹살", "갈비", "곱창", "막창", "구이", "바베큐", "정육"] },
  국밥해장: { emoji: "🍲", keywords: ["국밥", "해장국", "감자탕", "순대국", "설렁탕", "곰탕", "찌개", "전골"] },
  한식: { emoji: "🍚", keywords: ["한식", "백반", "한정식", "보리밥", "쌈밥", "도시락", "생선구이"] },
  중식: { emoji: "🥟", keywords: ["중식", "중국", "짜장", "짬뽕", "마라", "양꼬치"] },
  일식: { emoji: "🍣", keywords: ["일식", "일본", "초밥", "스시", "라멘", "돈까스", "돈카츠", "우동", "회"] },
  양식: { emoji: "🍝", keywords: ["양식", "이탈리안", "파스타", "피자", "스테이크", "멕시칸"] },
  베트남태국: { emoji: "🍜", keywords: ["베트남", "태국", "쌀국수", "팟타이", "아시아", "동남아"] },
  면분식: { emoji: "🍜", keywords: ["국수", "냉면", "칼국수", "김밥", "분식", "떡볶이", "만두"] },
  버거치킨: { emoji: "🍔", keywords: ["패스트푸드", "햄버거", "버거", "샌드위치", "치킨", "피자"] },
  카페: { emoji: "☕", keywords: ["카페", "커피", "베이커리", "디저트"] },
  기타식사: { emoji: "🥘", keywords: ["음식점", "뷔페", "푸드코트", "요리"] },
};

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
  categoryFilters: document.querySelector("#categoryFilters"),
  pickButton: document.querySelector("#pickButton"),
  pickCount: document.querySelector("#pickCount"),
  pickResult: document.querySelector("#pickResult"),
  searchInput: document.querySelector("#searchInput"),
  likeOnlyFilter: document.querySelector("#likeOnlyFilter"),
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
    throw new Error(data.error || `네이버 API 요청 오류 (${response.status})`);
  }
  return data;
}

function classifyRestaurant(place) {
  const text = `${place.categoryPath || ""} ${place.name || ""}`.toLowerCase();
  for (const [category, meta] of Object.entries(CATEGORY_META)) {
    if (category === "전체" || category === "기타식사") continue;
    if (meta.keywords.some((keyword) => text.includes(keyword))) return category;
  }
  return place.categoryGroup === "CE7" ? "카페" : "기타식사";
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

function togglePreference(id) {
  state.preferences[id] = preferenceFor(id) === "like" ? "neutral" : "like";
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state.preferences));
  applyFilters();
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
          searchable.replace(/\s+/g, "").includes(compactSearch)) &&
        (!elements.likeOnlyFilter.checked ||
          preferenceFor(restaurant.id) === "like")
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
  elements.pickButton.disabled = state.loading || state.filtered.length === 0;
  elements.pickCount.textContent = state.filtered.length
    ? `${state.filtered.length}곳 중 무작위`
    : "선택 가능한 식당 없음";
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
          <button class="preference-button ${preferenceFor(restaurant.id) === "like" ? "active" : ""}"
            type="button" data-like-id="${escapeHtml(restaurant.id)}"
            aria-label="${escapeHtml(restaurant.name)} 선호">♥</button>
        </article>`;
    })
    .join("");
}

function pickRestaurant() {
  if (!state.filtered.length) return;

  elements.pickButton.disabled = true;
  elements.pickResult.classList.add("shuffling");
  let ticks = 0;
  const interval = setInterval(() => {
    const candidate =
      state.filtered[Math.floor(Math.random() * state.filtered.length)];
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
        state.filtered[Math.floor(Math.random() * state.filtered.length)];
      elements.pickResult.innerHTML = `
        <div>
          <div class="winner-emoji">${CATEGORY_META[winner.category].emoji}</div>
          <p class="winner-category">${winner.category}</p>
          <h3 class="winner-name">${escapeHtml(winner.name)}</h3>
          <p class="winner-distance">${winner.distance}m · 도보권</p>
          <a class="winner-link" href="${mapUrl(winner)}" target="_blank" rel="noopener">
            카카오맵에서 보기
          </a>
        </div>`;
    }
  }, 80);
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
  elements.likeOnlyFilter.addEventListener("change", applyFilters);
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

  elements.restaurantList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-like-id]");
    if (!button) return;
    togglePreference(button.dataset.likeId);
  });

  const saved = JSON.parse(localStorage.getItem(SAVED_LOCATION_KEY) || "null");
  if (saved?.latitude && saved?.longitude && saved?.name) {
    await loadRestaurants(saved, saved.name);
  } else {
    requestCurrentLocation();
  }
}

initialize();
