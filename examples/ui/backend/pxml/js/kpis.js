/**
 * KPI Management Module
 * Handles KPI registration, rendering, updates, and formatting
 */

// KPI card HTML template
function createKPICardHTML(kpiId, config) {
    const kpi_name = config.name;
    const fa_icon = config.fa_icon;
    const unit = config.unit || "";
    
    return `
        <div class="bg-white rounded-lg shadow-sm border p-6 kpi-component h-full flex flex-col justify-center">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas ${fa_icon} text-blue-600 text-xl kpi-icon" data-kpi-id="${kpiId}"></i>
                    </div>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-sm font-medium text-gray-900 mb-1 kpi-name" data-kpi-id="${kpiId}">${kpi_name}</h3>
                    <div class="flex items-center justify-between">
                        <div class="flex items-baseline">
                            <span id="${kpiId}_value" class="text-2xl font-bold text-gray-900 kpi-value">
                                Loading...
                            </span>
                            ${unit ? `<span class="ml-1 text-sm text-gray-500 kpi-unit" data-kpi-id="${kpiId}">${unit}</span>` : ''}
                        </div>
                    </div>
                    <div id="${kpiId}_change" class="text-xs text-gray-500 mt-1">
                        <!-- Change indicator will be added here -->
                    </div>
                </div>
            </div>
        </div>`;
}

// KPI Management Functions
function renderKPICard(kpiId, config) {
    const container = document.getElementById(kpiId + '_container');
    if (!container) {
        console.error('KPI container not found:', kpiId + '_container');
        return;
    }
    
    // Render the KPI card HTML
    container.innerHTML = createKPICardHTML(kpiId, config);
    
    // Register the KPI
    registerKPI(kpiId, config.value_formula, config.format_type, config.unit);
}

function registerKPI(kpiId, formula, formatType, unit) {
    window.registeredKPIs[kpiId] = {
        formula: formula,
        formatType: formatType,
        unit: unit
    };
}

function updateKPI(kpiId) {
    const kpi = window.registeredKPIs[kpiId];
    if (!kpi) return;
    
    const valueElement = document.getElementById(kpiId + '_value');
    const changeElement = document.getElementById(kpiId + '_change');
    const containerElement = document.getElementById(kpiId + '_container');
    
    if (!valueElement) return;
    
    // Add updating class for visual feedback
    containerElement.classList.add('kpi-updating');
    
    try {
        // Evaluate the formula with current filtered data
        const rawValue = eval(kpi.formula);
        const formattedValue = formatKPIValue(rawValue, kpi.formatType);
        
        // Update the display
        valueElement.textContent = formattedValue;
    } catch (error) {
        console.error(`Error updating KPI ${kpiId}:`, error);
        valueElement.textContent = 'Error';
        changeElement.innerHTML = `<i class="fas fa-exclamation-triangle text-red-500"></i> Calculation error`;
    }
    
    // Remove updating class
    setTimeout(() => {
        containerElement.classList.remove('kpi-updating');
    }, 300);
}

function updateAllKPIs() {
    Object.keys(window.registeredKPIs).forEach(kpiId => {
        updateKPI(kpiId);
    });
}

function formatKPIValue(value, formatType) {
    if (value === null || value === undefined || isNaN(value)) {
        return '--';
    }
    
    switch (formatType) {
        case 'number':
            return new Intl.NumberFormat('en-US').format(Math.round(value));
        case 'currency':
        case 'currency:usd':
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(value);
        case 'percentage':
            return new Intl.NumberFormat('en-US', {
                style: 'percent',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }).format(value / 100);
        case 'decimal':
            return new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            }).format(value);
        default:
            return value.toString();
    }
}

// KPI editing functions (hooks for future implementation)
function editKPI(kpiId) {
    console.log('Edit KPI:', kpiId);
    const kpi = window.registeredKPIs[kpiId];
    if (!kpi) return;
    
    // TODO: Implement KPI editing modal/interface
    // This is where you'll add the dynamic editing functionality
    alert(`KPI editing will be implemented here for: ${kpiId}`);
}

function updateKPIProperty(kpiId, property, value) {
    const kpi = window.registeredKPIs[kpiId];
    if (!kpi) return;
    
    // Update KPI config
    kpi[property] = value;
    
    // Update UI element if needed
    if (property === 'name') {
        const nameElement = document.querySelector(`.kpi-name[data-kpi-id="${kpiId}"]`);
        if (nameElement) {
            nameElement.textContent = value;
        }
    } else if (property === 'fa_icon') {
        const iconElement = document.querySelector(`.kpi-icon[data-kpi-id="${kpiId}"]`);
        if (iconElement) {
            iconElement.className = `fas ${value} text-blue-600 text-xl kpi-icon`;
            iconElement.setAttribute('data-kpi-id', kpiId);
        }
    } else if (property === 'unit') {
        const unitElement = document.querySelector(`.kpi-unit[data-kpi-id="${kpiId}"]`);
        if (unitElement) {
            unitElement.textContent = value;
        } else if (value) {
            // Add unit if it didn't exist before
            const valueElement = document.getElementById(kpiId + '_value');
            if (valueElement && valueElement.parentNode) {
                const unitSpan = document.createElement('span');
                unitSpan.className = 'ml-1 text-sm text-gray-500 kpi-unit';
                unitSpan.setAttribute('data-kpi-id', kpiId);
                unitSpan.textContent = value;
                valueElement.parentNode.appendChild(unitSpan);
            }
        }
    }
    
    // Re-calculate KPI with new settings
    if (property === 'formula') {
        updateKPI(kpiId);
    }
}

// Make functions globally available
window.renderKPICard = renderKPICard;
window.updateKPI = updateKPI;
window.updateAllKPIs = updateAllKPIs;
window.formatKPIValue = formatKPIValue;
window.editKPI = editKPI;
window.updateKPIProperty = updateKPIProperty;
