// WebSocket connection
const socket = io();

// State mapping - user-friendly names
const stateNames = {
    0: 'Starting Up',
    1: 'Ready',
    2: 'Vehicle Connected',
    3: 'Preparing to Charge',
    4: 'Ready to Charge',
    5: 'Charging',
    6: 'Error',
    7: 'Service Mode'
};

// Connect to WebSocket and handle updates
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('status', (status) => {
    console.log('Status update:', status);
    updateUI(status);
});

socket.on('mode-changed', (mode) => {
    console.log('Mode changed:', mode);
    setActiveMode(mode);
});

socket.on('error', (error) => {
    console.error('Server error:', error);
});

// Update UI with status data
function updateUI(status) {
    // Set active mode based on backend status
    setActiveMode(status.mode);

    // Authorization
    updateAuthStatus(status.authorized);

    // State
    const stateName = stateNames[status.chargerState.evseState] || 'Unknown';
    document.getElementById('chargerState').textContent = stateName;

    // Update state color
    const stateElement = document.getElementById('chargerState');
    if (status.chargerState.evseState === 5) {
        stateElement.className = 'status-value charging';
    } else {
        stateElement.className = 'status-value idle';
    }

    // Current Grid Flow
    updateCurrentGridFlow(status.gridFlow);

    // Average Net Flow
    updateAvgNetFlow(status.movingAverage);

    // Power (convert W to kW) - always show
    const powerKw = (status.chargerState.chargingPower / 1000).toFixed(2);
    document.getElementById('powerValue').textContent = `${powerKw} kW`;

    // Target Current (commanded by algorithm) - always show
    const targetCurrent = status.targetCurrent.toFixed(1);
    document.getElementById('targetCurrent').textContent = `${targetCurrent} A`;

    // Energy Transferred (already in kWh) - always show
    const energyKwh = status.chargerState.sessionEnergy.toFixed(2);
    document.getElementById('energyValue').textContent = `${energyKwh} kWh`;

    // Duration (convert seconds to h m format) - always show
    const duration = formatDuration(status.chargerState.sessionDuration);
    document.getElementById('durationValue').textContent = duration;
}

// Format duration from seconds to "Xh Ym"
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// Set active mode button
function setActiveMode(mode) {
    const buttons = document.querySelectorAll('.mode-btn');
    buttons.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update mode description
    const modeDescription = document.getElementById('modeDescription');
    if (modeDescription && window.modeDescriptions) {
        modeDescription.textContent = window.modeDescriptions[mode];
    }
}

// Modal elements
const confirmModal = document.getElementById('confirmModal');
const modalModeName = document.getElementById('modalModeName');
const modalCancel = document.getElementById('modalCancel');
const modalConfirm = document.getElementById('modalConfirm');

// Mode name mapping for display
const modeDisplayNames = {
    solar_only: 'Solar Only',
    grid_support: 'Grid Support',
    boost: 'Boost'
};

// Pending mode change
let pendingMode = null;

// Show confirmation modal
function showConfirmModal(mode) {
    pendingMode = mode;
    modalModeName.textContent = modeDisplayNames[mode];
    confirmModal.classList.add('active');
}

// Hide confirmation modal
function hideConfirmModal() {
    confirmModal.classList.remove('active');
    pendingMode = null;
}

// Modal cancel handler
modalCancel.addEventListener('click', () => {
    hideConfirmModal();
});

// Modal confirm handler
modalConfirm.addEventListener('click', () => {
    if (pendingMode) {
        // Send mode change to server via WebSocket
        socket.emit('set-mode', pendingMode);

        // Update UI immediately
        setActiveMode(pendingMode);

        console.log('Mode change confirmed:', pendingMode);
    }
    hideConfirmModal();
});

// Close modal when clicking outside
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        hideConfirmModal();
    }
});

// Mode button click handler
document.querySelectorAll('.mode-btn').forEach(button => {
    button.addEventListener('click', function() {
        const mode = this.dataset.mode;

        // Show confirmation modal instead of immediately changing
        showConfirmModal(mode);
    });
});

// Request initial status on load
socket.emit('get-status');
