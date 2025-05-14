// Dashboard State Management
const dashboardState = {
  containers: [],
  charts: {
    status: null,
    shipping: null
  },
  map: {
    initialized: false,
    loading: false,
    error: null
  }
};

// DOM Elements Cache
const elements = {
  searchInput: document.getElementById("searchInput"),
  shippingFilter: document.getElementById("shippingFilter"),
  sizeFilter: document.getElementById("sizeFilter"),
  statusChart: document.getElementById("statusChart")?.getContext("2d"),
  shippingChart: document.getElementById("shippingLineChart")?.getContext("2d"),
  mapContainer: document.getElementById("us-map"),
  kpis: {
    total: document.querySelector("#total-containers p"),
    active: document.querySelector("#active-containers p"),
    archived: document.querySelector("#archived-containers p"),
    overdue: document.querySelector("#overdue-containers p")
  }
};

// Initialize Dashboard
async function initializeDashboard() {
  try {
    // Load container data
    const response = await fetch("http://198.245.53.14:5000/containers");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    dashboardState.containers = await response.json();

    // Initialize components
    initializeFilters();
    updateDashboard();
    initializeCharts();
    initializeMap();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    showErrorState();
  }
}

// Filter Functions
function initializeFilters() {
  if (!elements.shippingFilter || !elements.sizeFilter) return;
  const shippingLines = new Set();
  const sizes = new Set();

  dashboardState.containers.forEach(container => {
    if (container.shipping) shippingLines.add(container.shipping.trim());
    if (container.size) sizes.add(container.size.trim());
  });

  populateSelect(elements.shippingFilter, [...shippingLines].sort(), "All Shipping Lines");
  populateSelect(elements.sizeFilter, [...sizes].sort(), "All Sizes");
}

function populateSelect(selectElement, options, defaultText) {
  selectElement.innerHTML = `<option value="">${defaultText}</option>`;
  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    selectElement.appendChild(opt);
  });
}

// Dashboard Update
function updateDashboard() {
  const searchTerm = elements.searchInput?.value.toLowerCase() || '';
  const shippingFilter = elements.shippingFilter?.value || '';
  const sizeFilter = elements.sizeFilter?.value || '';

  const filteredContainers = dashboardState.containers.filter(container => {
    const matchesSearch =
      container.id?.toLowerCase().includes(searchTerm) ||
      container.blNumber?.toLowerCase().includes(searchTerm);
    const matchesShipping = !shippingFilter || container.shipping === shippingFilter;
    const matchesSize = !sizeFilter || container.size === sizeFilter;
    return matchesSearch && matchesShipping && matchesSize;
  });

  updateKPIs(filteredContainers);
  updateStatusChart(filteredContainers);
  updateMapData(filteredContainers);
}

function updateKPIs(containers) {
  if (!elements.kpis.total) return;
  const total = containers.length;
  const active = containers.filter(c => c.status !== "archived").length;
  const archived = containers.filter(c => c.status === "archived").length;
  const overdue = containers.filter(c => {
    if (!c.due_date) return false;
    const dueDate = new Date(c.due_date);
    return !isNaN(dueDate.getTime()) && dueDate < new Date();
  }).length;

  elements.kpis.total.textContent = total;
  elements.kpis.active.textContent = active;
  elements.kpis.archived.textContent = archived;
  elements.kpis.overdue.textContent = overdue;
}

// Chart Functions
function initializeCharts() {
  if (elements.shippingChart) {
    loadShippingLineChart();
  }
}

function updateStatusChart(containers) {
  if (!elements.statusChart) return;
  if (dashboardState.charts.status) {
    dashboardState.charts.status.destroy();
  }
  const statusCounts = containers.reduce((acc, container) => {
    const status = container.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const statusColors = {
    'active': '#3498db',
    'archived': '#f39c12',
    'in-transit': '#2ecc71',
    'overdue': '#e74c3c',
    'unknown': '#95a5a6'
  };

  dashboardState.charts.status = new Chart(elements.statusChart, {
    type: "pie",
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: "# of Containers",
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(status =>
          statusColors[status] || generateRandomColor()
        )
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#f0f0f0' }
        }
      }
    }
  });
}

async function loadShippingLineChart() {
  try {
    const response = await fetch("http://198.245.53.14:5000/containers/stats/shipping-line");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    renderShippingChart(data);
  } catch (error) {
    console.error("Failed to load shipping line chart:", error);
  }
}

function renderShippingChart(data) {
  if (!elements.shippingChart) return;
  if (dashboardState.charts.shipping) {
    dashboardState.charts.shipping.destroy();
  }

  const groupedData = data.reduce((acc, row) => {
    if (!row.month || !row.shipping) return acc;
    acc.months.add(row.month);
    acc.lines.add(row.shipping);
    acc.counts[row.shipping] = acc.counts[row.shipping] || {};
    acc.counts[row.shipping][row.month] = row.count || 0;
    return acc;
  }, { months: new Set(), lines: new Set(), counts: {} });

  const months = [...groupedData.months].sort();
  const shippingLines = [...groupedData.lines].sort();
  const datasets = shippingLines.map((line, index) => ({
    label: line,
    data: months.map(month => groupedData.counts[line][month] || 0),
    backgroundColor: generateColorFromIndex(index)
  }));

  dashboardState.charts.shipping = new Chart(elements.shippingChart, {
    type: 'bar',
    data: { labels: months, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Container Count by Shipping Line',
          color: '#f0f0f0'
        },
        legend: { labels: { color: '#f0f0f0' } }
      },
      scales: {
        x: {
          ticks: { color: '#a0a8c0' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          ticks: { color: '#a0a8c0' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });
}

// MAP FUNCTIONS (Polling approach)
function initializeMap() {
  if (!elements.mapContainer) return;
  showMapLoading();
  const maxWait = 5000; // Maximum wait of 5 seconds
  const intervalTime = 100; // Check every 100ms
  let waited = 0;
  const checkInterval = setInterval(() => {
    if (window.simplemaps_usmap && window.simplemaps_usmap.mapdata) {
      clearInterval(checkInterval);
      console.log("US Map library loaded.");
      dashboardState.map.initialized = true;
      elements.mapContainer.innerHTML = ""; // Clear the loading message
      updateMapData(dashboardState.containers);
    } else {
      waited += intervalTime;
      if (waited >= maxWait) {
        clearInterval(checkInterval);
        console.error("Map library did not load within the expected time.");
        showMapError();
      }
    }
  }, intervalTime);
}

function updateMapData(containers) {
  if (!dashboardState.map.initialized || !elements.mapContainer) return;
  try {
    const stateCounts = processContainerLocations(containers);
    const mapConfig = createMapConfig(stateCounts);
    if (window.simplemaps_usmap && window.simplemaps_usmap.mapdata) {
      window.simplemaps_usmap.mapdata.state_specific = mapConfig.state_specific;
      if (typeof window.simplemaps_usmap.refresh === "function") {
        window.simplemaps_usmap.refresh();
      } else {
        console.error("Map library refresh function is not available.");
      }
    } else {
      console.error("Map library not ready: window.simplemaps_usmap or its mapdata is undefined.");
    }
  } catch (error) {
    console.error("Failed to update map data:", error);
  }
}

function processContainerLocations(containers) {
  return containers.reduce((acc, container) => {
    if (!container.location) return acc;
    const state = extractStateAbbreviation(container.location);
    if (state) acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});
}

function extractStateAbbreviation(location) {
  if (!location || typeof location !== 'string') return null;
  const states = {
    'alabama': 'AL', 'alaska': 'AK', /* ... add all other states ... */
  };
  const codeMatch = location.trim().match(/(?:^|,|\s)([A-Z]{2})$/i);
  if (codeMatch && states[codeMatch[1].toLowerCase()]) {
    return codeMatch[1].toUpperCase();
  }
  const lowerLocation = location.toLowerCase();
  for (const [name, abbr] of Object.entries(states)) {
    if (lowerLocation.includes(name)) return abbr;
  }
  return null;
}

function createMapConfig(stateCounts) {
  const allStates = {
    'AL': 'Alabama', 'AK': 'Alaska', /* ... add all other states ... */
  };
  const config = {
    state_specific: {},
    color: "#252a36",
    border_color: "#3a3f4d",
    hover_color: "#00bcd4",
    label_color: "#f0f0f0",
    background: "transparent",
    active: false
  };
  Object.keys(allStates).forEach(abbr => {
    config.state_specific[abbr] = {
      color: stateCounts[abbr] ? getColorForCount(stateCounts[abbr]) : "#252a36",
      name: stateCounts[abbr] ? `${allStates[abbr]} (${stateCounts[abbr]})` : allStates[abbr]
    };
  });
  return config;
}

// UI Helpers
function showMapLoading() {
  if (!elements.mapContainer) return;
  elements.mapContainer.innerHTML = '<div class="map-loading">Loading map data...</div>';
}

function showMapError() {
  if (!elements.mapContainer) return;
  elements.mapContainer.innerHTML = `
    <div class="map-error">
      <p>Failed to load map</p>
      <button class="retry-button">Try Again</button>
      <p class="error-detail">Please check your internet connection</p>
    </div>
  `;
  elements.mapContainer.querySelector('.retry-button')?.addEventListener('click', initializeMap);
}

function showErrorState() {
  console.error("Dashboard is in error state");
}

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function generateColorFromIndex(index) {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function generateRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
}

function getColorForCount(count) {
  const intensity = Math.min(50 + (count * 20), 255);
  return `rgb(50, 100, ${intensity})`;
}

// Event Listeners
function setupEventListeners() {
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", debounce(updateDashboard, 300));
  }
  if (elements.shippingFilter) {
    elements.shippingFilter.addEventListener("change", updateDashboard);
  }
  if (elements.sizeFilter) {
    elements.sizeFilter.addEventListener("change", updateDashboard);
  }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeDashboard);
