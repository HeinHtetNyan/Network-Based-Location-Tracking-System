// ═══════════════════════════════════════════════════════
//  chart.js  —  Styled Chart.js bar chart
//  Function contract: updateChart(data)
// ═══════════════════════════════════════════════════════

let chart;

// ─── Colour gradient per bar ──────────────────────────
function barColors(values) {
  return values.map(v => {
    if (v > 10) return 'rgba(234,67,53,0.85)';
    if (v > 5)  return 'rgba(251,188,4,0.85)';
    return 'rgba(52,168,83,0.85)';
  });
}

function barBorderColors(values) {
  return values.map(v => {
    if (v > 10) return '#ea4335';
    if (v > 5)  return '#fbbc04';
    return '#34a853';
  });
}

// ─── Main update (called by app.js) ──────────────────
function updateChart(data) {
  const labels = data.map(ap => ap.ap_name);
  const values = data.map(ap => ap.devices.length);
  const colors = barColors(values);
  const borders = barBorderColors(values);

  const canvas = document.getElementById('chart');
  if (!canvas) return;

  // Global Chart.js defaults — dark theme
  Chart.defaults.color = '#9aa0ac';
  Chart.defaults.font.family = "'Google Sans', 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 11;

  if (chart) {
    // smooth data update (no destroy/recreate flicker)
    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.data.datasets[0].backgroundColor = colors;
    chart.data.datasets[0].borderColor = borders;
    chart.update('active');
    return;
  }

  chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Devices',
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1f2e',
          borderColor: 'rgba(66,133,244,0.35)',
          borderWidth: 1,
          titleColor: '#e8eaed',
          bodyColor: '#9aa0ac',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} device${ctx.parsed.y !== 1 ? 's' : ''}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#5f6368',
            maxRotation: 30,
            font: { size: 10 },
          },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false },
          ticks: {
            color: '#5f6368',
            stepSize: 1,
            font: { size: 10 },
          },
          border: { display: false },
          beginAtZero: true,
        }
      }
    }
  });
}
