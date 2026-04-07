let chart;

function updateChart(data) {
    let labels = data.map(ap => ap.ap_name);
    let values = data.map(ap => ap.devices.length);

    if (chart) chart.destroy();

    chart = new Chart(document.getElementById("chart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Devices per AP",
                data: values
            }]
        }
    });
}