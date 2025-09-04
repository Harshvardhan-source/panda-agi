/**
 * KPI Management Module
 * Handles KPI registration, updates, and formatting
 */

// KPI Management Functions
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
