function updateDashboard(data) {
    let totalAPs = data.length;
    let totalDevices = data.reduce((sum, ap) => sum + ap.devices.length, 0);

    document.getElementById("stats").innerHTML = `
        <p>APs: ${totalAPs}</p>
        <p>Devices: ${totalDevices}</p>
    `;

    // device list
    let allDevices = [];

    data.forEach(ap => {
        ap.devices.forEach(d => {
            allDevices.push({
                ...d,
                ap: ap.ap_name
            });
        });
    });

    renderDeviceList(allDevices);
}

function renderDeviceList(devices) {
    const container = document.getElementById("device-list");

    container.innerHTML = devices.map(d => `
        <div class="device-item">
            ${d.mac} <br>
            <small>${d.ap}</small>
        </div>
    `).join("");
}