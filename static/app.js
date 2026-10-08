
// ========================================
// SUPABASE
// ========================================

const SUPABASE_URL = "https://zfslncpdwhlxmbvnyll.supabase.co";

// ใส่ Publishable Key เดิมของคุณตรงนี้
const SUPABASE_KEY = "sb_publishable_i__qKShUyo2II1S3wg2_HA_C7oebBYD";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ========================================
// GLOBAL VARIABLES
// ========================================

let allDorms = [];
let filteredDorms = [];

let map;
let markersLayer;


// ========================================
// START
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    initMap();

    loadDorms();

    setupFilters();

});


// ========================================
// MAP
// ========================================

function initMap() {

    // ตำแหน่งเริ่มต้นบริเวณปราจีนบุรี
    map = L.map("map").setView(
        [14.05, 101.37],
        12
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}


// ========================================
// LOAD DORMS FROM SUPABASE
// ========================================

async function loadDorms() {

    const loading =
        document.getElementById("loading");

    try {

        const { data, error } =
            await supabaseClient
                .from("dorms")
                .select("*")
                .eq("status", "approved");

        if (error) {
            throw error;
        }

        allDorms = data || [];

        filteredDorms = [...allDorms];

        loading.style.display = "none";

        applyFilters();

    } catch (error) {

        console.error(error);

        loading.innerHTML = `
            <h3>ไม่สามารถโหลดข้อมูลหอพักได้</h3>
            <p>กรุณาตรวจสอบ Supabase Key และการตั้งค่า Database</p>
        `;

    }
}


// ========================================
// FILTER
// ========================================

function setupFilters() {

    const ids = [
        "searchInput",
        "minPrice",
        "maxPrice",
        "distanceFilter",
        "sortFilter",
        "airFilter",
        "wifiFilter",
        "parkingFilter"
    ];

    ids.forEach(id => {

        const element =
            document.getElementById(id);

        if (!element) return;

        element.addEventListener(
            "input",
            applyFilters
        );

        element.addEventListener(
            "change",
            applyFilters
        );

    });

}


// ========================================
// APPLY FILTERS
// ========================================

function applyFilters() {

    const search =
        document
            .getElementById("searchInput")
            .value
            .trim()
            .toLowerCase();

    const minPrice =
        Number(
            document.getElementById("minPrice").value
        ) || 0;

    const maxPrice =
        Number(
            document.getElementById("maxPrice").value
        ) || Infinity;

    const maxDistance =
        Number(
            document.getElementById("distanceFilter").value
        ) || Infinity;

    const air =
        document.getElementById("airFilter").checked;

    const wifi =
        document.getElementById("wifiFilter").checked;

    const parking =
        document.getElementById("parkingFilter").checked;


    filteredDorms = allDorms.filter(dorm => {

        const name =
            String(dorm.name || "")
                .toLowerCase();

        const description =
            String(dorm.description || "")
                .toLowerCase();

        const matchesSearch =
            !search ||
            name.includes(search) ||
            description.includes(search);

        const rent =
            Number(dorm.rent_min || 0);

        const distance =
            Number(dorm.distance_km || 999);

        const matchesPrice =
            rent >= minPrice &&
            rent <= maxPrice;

        const matchesDistance =
            distance <= maxDistance;

        const matchesAir =
            !air || dorm.air_condition === true;

        const matchesWifi =
            !wifi || dorm.wifi === true;

        const matchesParking =
            !parking || dorm.parking === true;

        return (
            matchesSearch &&
            matchesPrice &&
            matchesDistance &&
            matchesAir &&
            matchesWifi &&
            matchesParking
        );

    });


    sortDorms();

    renderDorms();

    updateMap();

}


// ========================================
// SORT
// ========================================

function sortDorms() {

    const sort =
        document.getElementById("sortFilter").value;

    filteredDorms.sort((a, b) => {

        if (sort === "distance") {

            return (
                Number(a.distance_km || 999) -
                Number(b.distance_km || 999)
            );

        }

        if (sort === "price_low") {

            return (
                Number(a.rent_min || 0) -
                Number(b.rent_min || 0)
            );

        }

        if (sort === "price_high") {

            return (
                Number(b.rent_min || 0) -
                Number(a.rent_min || 0)
            );

        }

        if (sort === "rating") {

            return (
                Number(b.rating || 0) -
                Number(a.rating || 0)
            );

        }

        return 0;

    });

}


// ========================================
// RENDER DORM CARDS
// ========================================

function renderDorms() {

    const grid =
        document.getElementById("dormGrid");

    const empty =
        document.getElementById("emptyState");

    const resultCount =
        document.getElementById("resultCount");


    resultCount.textContent =
        `พบ ${filteredDorms.length} แห่ง`;


    grid.innerHTML = "";


    if (filteredDorms.length === 0) {

        empty.style.display = "block";

        return;

    }


    empty.style.display = "none";


    filteredDorms.forEach(dorm => {

        const card =
            document.createElement("div");

        card.className = "dorm-card";

        card.innerHTML = `

            <div class="dorm-content">

                <div class="dorm-name">
                    ${escapeHtml(dorm.name)}
                </div>

                <div class="dorm-address">
                    📍 ${escapeHtml(
                        dorm.address || "ไม่ระบุที่อยู่"
                    )}
                </div>

                <div class="dorm-price">
                    💰 ${formatPrice(dorm.rent_min)}
                    -
                    ${formatPrice(dorm.rent_max)}
                    บาท/เดือน
                </div>

                <div class="dorm-distance">
                    🚗 ระยะทาง
                    ${dorm.distance_km ?? "-"}
                    กม.
                </div>

                <div class="dorm-rating">
                    ⭐ ${dorm.rating || 0}
                    (${dorm.review_count || 0} รีวิว)
                </div>

                <div class="dorm-features">

                    ${
                        dorm.air_condition
                        ? '<span class="feature-tag">❄️ แอร์</span>'
                        : ""
                    }

                    ${
                        dorm.wifi
                        ? '<span class="feature-tag">📶 Wi-Fi</span>'
                        : ""
                    }

                    ${
                        dorm.parking
                        ? '<span class="feature-tag">🚗 ที่จอดรถ</span>'
                        : ""
                    }

                </div>

                <button
                    onclick="focusDorm('${dorm.id}')"
                >
                    📍 ดูบนแผนที่
                </button>

            </div>

        `;

        grid.appendChild(card);

    });

}


// ========================================
// UPDATE MAP
// ========================================

function updateMap() {

    markersLayer.clearLayers();


    const validDorms =
        filteredDorms.filter(dorm => {

            return (
                dorm.latitude !== null &&
                dorm.longitude !== null &&
                !isNaN(Number(dorm.latitude)) &&
                !isNaN(Number(dorm.longitude))
            );

        });


    const bounds = [];


    validDorms.forEach(dorm => {

        const lat =
            Number(dorm.latitude);

        const lng =
            Number(dorm.longitude);


        const marker =
            L.marker([lat, lng]);


        const popup = `

            <div class="map-popup-title">
                ${escapeHtml(dorm.name)}
            </div>

            <div class="map-popup-price">
                💰 ${formatPrice(dorm.rent_min)}
                - ${formatPrice(dorm.rent_max)}
                บาท/เดือน
            </div>

            <div class="map-popup-distance">
                📍 ${dorm.distance_km ?? "-"} กม.
            </div>

            <button
                onclick="focusDorm('${dorm.id}')"
            >
                ดูรายละเอียด
            </button>

        `;


        marker.bindPopup(popup);

        marker.addTo(markersLayer);

        bounds.push([lat, lng]);

    });


    // ถ้ามีหอพัก ให้แผนที่ปรับไปยังหอพักทั้งหมด
    if (bounds.length > 0) {

        map.fitBounds(bounds, {
            padding: [40, 40]
        });

    }

}


// ========================================
// FOCUS DORM
// ========================================

function focusDorm(id) {

    const dorm =
        allDorms.find(
            item => item.id === id
        );

    if (!dorm) return;


    if (
        dorm.latitude === null ||
        dorm.longitude === null
    ) {

        alert(
            "หอพักนี้ยังไม่มีพิกัดบนแผนที่"
        );

        return;

    }


    const lat =
        Number(dorm.latitude);

    const lng =
        Number(dorm.longitude);


    map.setView(
        [lat, lng],
        17
    );


    markersLayer.eachLayer(marker => {

        const position =
            marker.getLatLng();

        if (
            Math.abs(position.lat - lat) < 0.000001 &&
            Math.abs(position.lng - lng) < 0.000001
        ) {

            marker.openPopup();

        }

    });

}


// ========================================
// HELPERS
// ========================================

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return Number(value).toLocaleString("th-TH");

}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

