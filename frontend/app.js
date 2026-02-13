// Theme Management Functions
function setTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // Update Icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.icon');
        if (icon) {
            icon.textContent = theme === 'light' ? '☀️' : '🌙';
        }
    }

    // Update Chart Colors
    updateChartTheme(theme);
}

function updateChartTheme(theme) {
    if (!throughputChart) return;

    const isLight = theme === 'light';
    const color = isLight ? '#2563eb' : '#3b82f6';
    const bg = isLight ? 'rgba(37, 99, 235, 0.1)' : 'rgba(59, 130, 246, 0.15)';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';

    throughputChart.data.datasets[0].borderColor = color;
    throughputChart.data.datasets[0].backgroundColor = bg;
    throughputChart.options.scales.x.grid.color = gridColor;
    throughputChart.options.scales.y.grid.color = gridColor;
    throughputChart.update();
}

// Initialize theme early
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Chart configuration
let throughputChart;
const chartConfig = {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Throughput (MB/s)',
            data: [],
            borderColor: '#3b82f6',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', font: { family: 'Inter' } }
            },
            x: {
                display: false,
                grid: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#e2e8f0',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false
            }
        }
    }
};

// Application State
let activeStream = null;
let startTime = 0;
let bytesReceived = 0;
let chunks = 0;

// Instantaneous Throughput State
let lastBytesCheck = 0;
let lastTimeCheck = 0;
let currentThroughput = 0;

// DOM Elements
const elements = {
    status: document.getElementById('connection-status'),
    btnData: document.getElementById('btn-stream-data'),
    btnLogs: document.getElementById('btn-stream-logs'),
    btnStop: document.getElementById('btn-stop'),
    datasetSize: document.getElementById('dataset-size'),
    throughput: document.getElementById('metric-throughput'),
    progress: document.querySelector('#metric-progress'),
    barThroughput: document.getElementById('bar-throughput'),
    chunks: document.getElementById('metric-chunks'),
    backpressure: document.getElementById('metric-backpressure'),
    terminal: document.getElementById('stream-output')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Setup Chart
    const ctx = document.getElementById('throughput-chart').getContext('2d');
    throughputChart = new Chart(ctx, chartConfig);

    // Initial Theme Sync
    updateChartTheme(savedTheme);

    // Setup Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            setTheme(newTheme);
        });
    }

    // Check Health
    checkHealth();

    // Event Listeners
    elements.btnData.addEventListener('click', () => startDataStream());
    elements.btnLogs.addEventListener('click', () => startLogStream());
    elements.btnStop.addEventListener('click', stopStream);
});

async function checkHealth() {
    try {
        const res = await fetch('/health');
        if (res.ok) {
            const statusText = elements.status.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = 'System Online';
            }
            elements.status.className = 'status-badge connected';
        }
    } catch (err) {
        const statusText = elements.status.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = 'Connection Error';
        }
        elements.status.className = 'status-badge error';
    }
}

async function startDataStream() {
    const count = elements.datasetSize.value;
    startStream(`/api/stream/large-dataset?count=${count}`);
}

async function startLogStream() {
    startStream('/api/stream/logs');
}

async function startStream(url) {
    if (activeStream) activeStream.cancel();

    // Reset UI
    setControlsState(true);
    resetMetrics();
    log('System', `Starting stream: ${url}`);

    try {
        const response = await fetch(url);
        const reader = response.body.getReader();
        activeStream = reader;

        startTime = performance.now();
        lastTimeCheck = startTime;
        lastBytesCheck = 0;

        // Read loop
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                log('System', 'Stream completed successfully');
                updateChart(); // Ensure final point is plotted
                break;
            }

            // Process chunk
            processChunk(value);

            // Update Chart & Throughput every 100ms
            const now = performance.now();
            if (now - lastTimeCheck > 100) {
                calculateInstantaneousThroughput(now);
                updateChart();

                // Sample log text occasionally
                if (chunks % 5 === 0) {
                    const text = new TextDecoder().decode(value.slice(0, 100));
                    log('Data', text + '...');
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            log('System', 'Stream stopped by user');
        } else {
            console.error(err);
            log('Error', `Stream failed: ${err.message}`);
        }
    } finally {
        setControlsState(false);
        activeStream = null;
    }
}

function processChunk(chunk) {
    bytesReceived += chunk.length;
    chunks++;
}

function calculateInstantaneousThroughput(now) {
    const timeDiff = (now - lastTimeCheck) / 1000; // seconds
    const bytesDiff = bytesReceived - lastBytesCheck;

    if (timeDiff > 0) {
        const mb = bytesDiff / 1024 / 1024;
        currentThroughput = mb / timeDiff;
    }

    lastTimeCheck = now;
    lastBytesCheck = bytesReceived;

    // Update UI with dynamic units
    let displayValue;
    if (currentThroughput < 0.01) {
        // Show in KB/s for small values
        displayValue = (currentThroughput * 1024).toFixed(2);
        // Update unit label
        const unitSpan = document.querySelector('.metrics-grid .metric:first-child .unit');
        if (unitSpan) unitSpan.textContent = 'KB/s';
    } else {
        displayValue = currentThroughput.toFixed(2);
        const unitSpan = document.querySelector('.metrics-grid .metric:first-child .unit');
        if (unitSpan) unitSpan.textContent = 'MB/s';
    }
    elements.throughput.textContent = displayValue;
    elements.chunks.textContent = chunks.toLocaleString();

    // Update progress (estimate)
    const targetSize = elements.datasetSize.value;
    if (targetSize) {
        const targetBytes = targetSize * 150; // Estimate ~150 bytes per doc
        const percent = Math.min(100, Math.round((bytesReceived / targetBytes) * 100));
        elements.progress.textContent = percent;
    }
}

function updateChart() {
    const now = new Date().toLocaleTimeString();

    if (throughputChart.data.labels.length > 30) {
        throughputChart.data.labels.shift();
        throughputChart.data.datasets[0].data.shift();
    }

    throughputChart.data.labels.push(now);
    throughputChart.data.datasets[0].data.push(currentThroughput);
    throughputChart.update('none'); // 'none' mode for performance
}

function stopStream() {
    if (activeStream) {
        activeStream.cancel();
    }
}

function setControlsState(isStreaming) {
    elements.btnData.disabled = isStreaming;
    elements.btnLogs.disabled = isStreaming;
    elements.btnStop.disabled = !isStreaming;
}

function resetMetrics() {
    bytesReceived = 0;
    chunks = 0;
    startTime = 0;
    lastBytesCheck = 0;
    lastTimeCheck = 0;
    currentThroughput = 0;

    elements.throughput.textContent = '0.00';
    elements.progress.textContent = '0';
    elements.chunks.textContent = '0';
    elements.terminal.innerHTML = '';

    throughputChart.data.labels = [];
    throughputChart.data.datasets[0].data = [];
    throughputChart.update();
}

function log(type, message) {
    const div = document.createElement('div');
    div.className = `terminal-line ${type.toLowerCase()}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${type}: ${message}`;
    elements.terminal.appendChild(div);
    elements.terminal.scrollTop = elements.terminal.scrollHeight;
}
