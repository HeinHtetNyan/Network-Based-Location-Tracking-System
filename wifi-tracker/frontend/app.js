const map = L.map('map').setView([13.75, 100.50], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const markers = L.markerClusterGroup();
map.addLayer(markers);

function getColor(count) {
    if (count > 10) return "red";
    if (count > 5) return "orange";
    return "green";
}

function createIcon(count, color) {
    return L.divIcon({
        html: `<div style="
            background:${color};
            width:40px;height:40px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-weight:bold;
        ">${count}</div>`,
        className: ""
    });
}

async function loadData() {
    const res = await fetch("/api/map-data");
    const data = await res.json();

    markers.clearLayers();

    data.forEach(ap => {
        const count = ap.devices.length;

        const marker = L.marker([ap.lat, ap.lng], {
            icon: createIcon(count, getColor(count))
        });

        marker.bindPopup(`<b>${ap.ap_name}</b><br>${count} devices`);

        markers.addLayer(marker);
    });

    // 🔥 update dashboard + chart
    updateDashboard(data);
    updateChart(data);
}

setInterval(loadData, 3000);
loadData();