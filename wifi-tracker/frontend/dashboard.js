//  dashboard.js  —  Stat cards + device list
//  Function contract: updateDashboard(data), renderDeviceList(devices)

// Animate a number change
function animateValue(el, newVal) {
  if (!el) return;
  const prev = el.textContent;
  if (prev === String(newVal)) return;
  el.textContent = newVal;
  el.classList.remove('num-pop');
  void el.offsetWidth; // reflow
  el.classList.add('num-pop');
}

// Signal strength helper
function getSignalBars(signal) {
  // signal is typically negative dBm (e.g. -55)
  // stronger = closer to 0
  if (!signal || signal === 0) return { bars: 2, cls: 'medium' };
  if (signal >= -55) return { bars: 4, cls: 'strong' };
  if (signal >= -70) return { bars: 3, cls: 'strong' };
  if (signal >= -80) return { bars: 2, cls: 'medium' };
  return { bars: 1, cls: 'weak' };
}

function buildSignalBars(signal) {
  const { bars, cls } = getSignalBars(signal);
  let html = `<div class="signal-bars ${cls}">`;
  for (let i = 1; i <= 4; i++) {
    html += `<div class="signal-bar${i <= bars ? ' active' : ''}"></div>`;
  }
  html += '</div>';
  return html;
}

// Device colour dot
function getDeviceDotColor(signal) {
  const { cls } = getSignalBars(signal);
  return cls === 'strong' ? '#34a853' : cls === 'medium' ? '#fbbc04' : '#ea4335';
}

// Main update function (called by app.js)
function updateDashboard(data) {
  const totalAPs      = data.length;
  const totalDevices  = data.reduce((s, ap) => s + ap.devices.length, 0);
  const avgDensity    = totalAPs > 0 ? (totalDevices / totalAPs).toFixed(1) : '0';

  // Stat card values
  animateValue(document.getElementById('val-aps'),     totalAPs);
  animateValue(document.getElementById('val-devices'), totalDevices);
  animateValue(document.getElementById('val-density'), avgDensity);

  // Badges
  const apBadge = document.getElementById('badge-aps');
  const devBadge = document.getElementById('badge-devices');
  if (apBadge)  apBadge.textContent  = totalAPs + ' online';
  if (devBadge) devBadge.textContent = totalDevices > 0 ? 'Active' : 'Empty';

  // Build flat device list
  const allDevices = [];
  data.forEach(ap => {
    ap.devices.forEach(d => {
      allDevices.push({ ...d, ap: ap.ap_name, lat: ap.lat, lng: ap.lng });
    });
  });

  renderDeviceList(allDevices);
}

// Device list renderer
let _lastSearch = '';

function renderDeviceList(devices) {
  const container = document.getElementById('device-list');
  const searchEl  = document.getElementById('search');
  if (!container) return;

  // wire up search once
  if (searchEl && !searchEl._bound) {
    searchEl.addEventListener('input', () => {
      _lastSearch = searchEl.value.trim().toLowerCase();
      _renderFiltered(devices);
    });
    searchEl._bound = true;
  }

  _renderFiltered(devices);
}

function _renderFiltered(devices) {
  const container = document.getElementById('device-list');
  if (!container) return;

  const q = _lastSearch;
  const filtered = q
    ? devices.filter(d =>
        d.mac.toLowerCase().includes(q) ||
        d.ap.toLowerCase().includes(q)
      )
    : devices;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span>${q ? 'No devices match "' + q + '"' : 'No devices connected'}</span>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(d => {
    const dotColor = getDeviceDotColor(d.signal);
    const sigBars  = buildSignalBars(d.signal);
    const sigLabel = d.signal ? d.signal + ' dBm' : '';
    const apSafe   = d.ap.replace(/'/g, "\\'");
    return `
      <div class="device-item" title="${sigLabel}" onclick="selectDevice(this, '${apSafe}')">
        <div class="device-dot" style="background:${dotColor}"></div>
        <div class="device-info">
          <div class="device-mac">${d.mac}</div>
          <div class="device-ap">${d.ap}</div>
        </div>
        ${sigBars}
      </div>`;
  }).join('');
}

function selectDevice(el, apName) {
  document.querySelectorAll('.device-item.selected').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  if (typeof flyToAP === 'function') flyToAP(apName);
}

// expose renderDeviceList globally (called from search event)
window.renderDeviceList = renderDeviceList;
