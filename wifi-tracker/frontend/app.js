//  app.js  —  Map initialisation + data loading
//  API contract: GET /api/map-data  (unchanged)

// Show any uncaught runtime error in the topbar so we can diagnose
window.onerror = function(msg, src, line) {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'JS Error: ' + msg + ' (' + (src||'').split('/').pop() + ':' + line + ')';
};

// Dark CartoDB tiles (Google Maps dark feel)
const DARK_TILES  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR   = '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap';

let isDark = localStorage.getItem('nettrack-theme') !== 'light';
let tileLayer;

const map = L.map('map', {
  zoomControl: true,
  attributionControl: true,
}).setView([13.75, 100.50], 12);

// Theme toggle
function applyTheme(dark) {
  isDark = dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem('nettrack-theme', dark ? 'dark' : 'light');

  const label = document.getElementById('theme-toggle-label');
  const icon  = document.getElementById('toggle-icon');
  if (label) label.textContent = dark ? 'Dark' : 'Light';
  if (icon)  icon.textContent  = dark ? '🌙' : '☀️';

  if (tileLayer) map.removeLayer(tileLayer);
  tileLayer = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
    attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  // sync chart colours with theme (guard against window.chart being the canvas DOM element)
  if (typeof chart !== 'undefined' && chart && typeof chart.update === 'function') {
    const gridCol      = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const tickCol      = dark ? '#5f6368' : '#9aa0ac';
    const tooltipBg    = dark ? '#1a1f2e' : '#ffffff';
    const tooltipTitle = dark ? '#e8eaed' : '#202124';
    const tooltipBody  = dark ? '#9aa0ac' : '#5f6368';
    chart.options.scales.x.grid.color        = gridCol;
    chart.options.scales.y.grid.color        = gridCol;
    chart.options.scales.x.ticks.color       = tickCol;
    chart.options.scales.y.ticks.color       = tickCol;
    chart.options.plugins.tooltip.backgroundColor = tooltipBg;
    chart.options.plugins.tooltip.titleColor  = tooltipTitle;
    chart.options.plugins.tooltip.bodyColor   = tooltipBody;
    Chart.defaults.color = tickCol;
    chart.update();
  }
}

function toggleTheme() { applyTheme(!isDark); }

// Init theme on load
applyTheme(isDark);

// Marker references by AP name
const markersByAP = {};

// ─── Fly to AP and open popup (called from device list) ─
function flyToAP(apName) {
  const marker = markersByAP[apName];
  if (!marker) return;
  if (typeof markers.zoomToShowLayer === 'function') {
    markers.zoomToShowLayer(marker, () => {
      map.panTo(marker.getLatLng());
      marker.openPopup();
    });
  } else {
    map.setView(marker.getLatLng(), 16);
    marker.openPopup();
  }
}

// ─── Marker cluster group (fallback to featureGroup if CDN unavailable) ─
const markers = (typeof L.markerClusterGroup === 'function')
  ? L.markerClusterGroup({
  showCoverageOnHover: false,
  maxClusterRadius: 60,
  iconCreateFunction: function (cluster) {
    const count = cluster.getChildCount();
    return L.divIcon({
      html: `<div class="cluster-icon" style="
        width:42px;height:42px;border-radius:50%;
        background:rgba(66,133,244,0.85);
        border:2px solid rgba(66,133,244,0.4);
        box-shadow:0 0 20px rgba(66,133,244,0.4);
        display:flex;align-items:center;justify-content:center;
        color:white;font-weight:700;font-size:14px;
        font-family:'Google Sans',sans-serif;
      ">${count}</div>`,
      className: '',
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  },
})
  : L.featureGroup();
map.addLayer(markers);

// Colour logic (same thresholds as original)
function getColor(count) {
  if (count > 10) return { fill: '#ea4335', glow: 'rgba(234,67,53,0.5)' };
  if (count > 5)  return { fill: '#fbbc04', glow: 'rgba(251,188,4,0.5)' };
  return               { fill: '#34a853', glow: 'rgba(52,168,83,0.5)' };
}

// Custom marker icon
function createIcon(count, colorObj) {
  const { fill, glow } = colorObj;
  const size = Math.min(52, 36 + count * 1.2);

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        <!-- Pulse ring -->
        <div style="
          position:absolute;width:${size}px;height:${size}px;border-radius:50%;
          border:2px solid ${fill};opacity:0.5;
          animation:markerRing 2.5s ease-out infinite;
        "></div>
        <!-- Body -->
        <div style="
          width:${size * 0.72}px;height:${size * 0.72}px;border-radius:50%;
          background:${fill};
          box-shadow:0 0 14px ${glow}, 0 2px 8px rgba(0,0,0,0.5);
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:${size < 40 ? 12 : 14}px;
          font-family:'Google Sans',sans-serif;
          border:2px solid rgba(255,255,255,0.25);
          position:relative;z-index:1;
        ">${count}</div>
      </div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 6)],
  });
}

// Popup HTML builder
function buildPopup(ap) {
  const count = ap.devices.length;
  const c = getColor(count);
  return `
    <div class="popup-inner">
      <div class="popup-title">${ap.ap_name}</div>
      <div class="popup-stat">
        <span class="popup-dot" style="background:${c.fill}"></span>
        <strong style="color:${c.fill}">${count}</strong>&nbsp;device${count !== 1 ? 's' : ''} connected
      </div>
      <div class="popup-stat" style="margin-top:6px;color:#5f6368;font-size:11px;">
        ${ap.lat.toFixed(5)}, ${ap.lng.toFixed(5)}
      </div>
    </div>`;
}

// Refresh countdown
let countdown = 3;
const countdownEl = document.getElementById('refresh-countdown');
const lastUpdatedEl = document.getElementById('last-updated');

setInterval(() => {
  countdown--;
  if (countdown < 0) countdown = 3;
  if (countdownEl) countdownEl.textContent = countdown + 's';
}, 1000);

// Main data loader
async function loadData() {
  try {
    const res  = await fetch('/api/map-data');
    const data = await res.json();

    markers.clearLayers();
    // reset references so stale APs don't persist
    Object.keys(markersByAP).forEach(k => delete markersByAP[k]);

    data.forEach(ap => {
      const count  = ap.devices.length;
      const colorObj = getColor(count);

      const marker = L.marker([ap.lat, ap.lng], {
        icon: createIcon(count, colorObj),
      });

      marker.bindPopup(buildPopup(ap), { maxWidth: 240 });
      markersByAP[ap.ap_name] = marker;

      markers.addLayer(marker);
    });

    // update timestamp
    if (lastUpdatedEl) {
      const now = new Date();
      lastUpdatedEl.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    countdown = 3;

    // update sidebar panels (dashboard.js + chart.js)
    updateDashboard(data);
    updateChart(data);

  } catch (err) {
    console.warn('NetTrack: fetch error', err);
    if (lastUpdatedEl) lastUpdatedEl.textContent = 'Connection error';
  }
}

// Poll every 3 seconds (original interval)
setInterval(loadData, 3000);
loadData();
