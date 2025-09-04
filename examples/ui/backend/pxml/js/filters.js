/**
 * Filter Management Module
 * Handles all filter-related functionality
 */

// Filter management functions
function toggleFilterDropdown(filterId) {
    const dropdown = document.getElementById(filterId + '_dropdown');
    const isHidden = dropdown.classList.contains('hidden');
    
    // Close all other dropdowns
    document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
    
    if (isHidden) {
        dropdown.classList.remove('hidden');
    }
}

function initializeListFilter(filterId, values, filterName) {
    const optionsContainer = document.getElementById(filterId + '_options');
    const uniqueValues = [...new Set(values)].sort();
    
    optionsContainer.innerHTML = uniqueValues.map(value => `
        <div class="filter-item px-2 py-1 text-sm rounded" 
             onclick="toggleFilterOption('${filterId}', '${value}', '${filterName}')">
            <input type="checkbox" id="${filterId}_${value}" class="mr-2">
            <span>${value}</span>
        </div>
    `).join('');
}

function initializeRangeFilter(filterId, values, filterName) {
    const numbers = values.filter(v => !isNaN(v) && v !== null && v !== '').map(Number);
    if (numbers.length === 0) return;
    
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    
    // Set placeholder text
    minInput.placeholder = min.toString();
    maxInput.placeholder = max.toString();
    
    // Set min/max attributes to constrain input values
    minInput.min = min;
    minInput.max = max;
    maxInput.min = min;
    maxInput.max = max;
    
    // Update display info
    document.getElementById(filterId + '_min_val').textContent = min;
    document.getElementById(filterId + '_max_val').textContent = max;
}

function initializeDateRangeFilter(filterId, values, filterName) {
    const dates = values.filter(v => v && !isNaN(Date.parse(v))).map(v => new Date(v));
    if (dates.length === 0) return;
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const minDateStr = minDate.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    
    // Set min/max constraints for both inputs
    startInput.min = minDateStr;
    startInput.max = maxDateStr;
    endInput.min = minDateStr;
    endInput.max = maxDateStr;
}

function toggleFilterOption(filterId, value, filterName) {
    const checkbox = document.getElementById(`${filterId}_${value}`);
    checkbox.checked = !checkbox.checked;
    updateListFilter(filterId, filterName);
}

function updateListFilter(filterId, filterName) {
    const checkboxes = document.querySelectorAll(`[id^="${filterId}_"][type="checkbox"]`);
    const selectedValues = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.id.replace(filterId + '_', ''));
    
    if (selectedValues.length === 0) {
        delete window.currentFilters[filterName];
        document.getElementById(filterId + '_display').textContent = `Select ${filterName}`;
    } else {
        window.currentFilters[filterName] = selectedValues;
        const displayText = selectedValues.length === 1 
            ? selectedValues[0]
            : `${selectedValues.length} selected`;
        document.getElementById(filterId + '_display').textContent = displayText;
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
    // Close dropdown
    document.getElementById(filterId + '_dropdown').classList.add('hidden');
}

function validateAndUpdateRangeFilter(filterId, filterName, inputType) {
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    const currentInput = inputType === 'min' ? minInput : maxInput;
    
    // Validate the current input against data bounds
    if (currentInput.value) {
        const value = Number(currentInput.value);
        const dataMin = Number(currentInput.min);
        const dataMax = Number(currentInput.max);
        
        // Auto-correct values outside data bounds
        if (value < dataMin) {
            currentInput.value = dataMin;
        } else if (value > dataMax) {
            currentInput.value = dataMax;
        }
    }
    
    const minVal = minInput.value ? Number(minInput.value) : undefined;
    const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
    
    // Ensure logical consistency (min <= max)
    if (minVal !== undefined && maxVal !== undefined) {
        if (minVal > maxVal) {
            if (inputType === 'min') {
                maxInput.value = minVal;
            } else {
                minInput.value = maxVal;
            }
        }
    }
    
    // Update the filter
    updateRangeFilter(filterId, filterName);
}

function updateRangeFilter(filterId, filterName) {
    const minInput = document.getElementById(filterId + '_min');
    const maxInput = document.getElementById(filterId + '_max');
    const minVal = minInput.value ? Number(minInput.value) : undefined;
    const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
    
    if (minVal !== undefined || maxVal !== undefined) {
        window.currentFilters[filterName] = {
            min: minVal,
            max: maxVal
        };
    } else {
        delete window.currentFilters[filterName];
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

function validateAndUpdateDateRangeFilter(filterId, filterName, inputType) {
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    const currentInput = inputType === 'start' ? startInput : endInput;
    
    if (!currentInput.value) {
        updateDateRangeFilter(filterId, filterName);
        return;
    }
    
    const value = currentInput.value;
    const dataMin = currentInput.min;
    const dataMax = currentInput.max;
    
    // Auto-correct values outside data bounds
    if (value < dataMin) {
        currentInput.value = dataMin;
    } else if (value > dataMax) {
        currentInput.value = dataMax;
    }
    
    // Ensure logical consistency (start <= end)
    const startDate = startInput.value;
    const endDate = endInput.value;
    
    if (startDate && endDate) {
        if (startDate > endDate) {
            if (inputType === 'start') {
                endInput.value = startDate;
            } else {
                startInput.value = endDate;
            }
        }
    }
    
    updateDateRangeFilter(filterId, filterName);
}

function updateDateRangeFilter(filterId, filterName) {
    const startInput = document.getElementById(filterId + '_start');
    const endInput = document.getElementById(filterId + '_end');
    const startDate = startInput.value;
    const endDate = endInput.value;
    
    if (startDate || endDate) {
        window.currentFilters[filterName] = {
            start: startDate,
            end: endDate
        };
    } else {
        delete window.currentFilters[filterName];
    }
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

function clearFilterSelection(filterId, filterName) {
    const checkboxes = document.querySelectorAll(`[id^="${filterId}_"][type="checkbox"]`);
    checkboxes.forEach(cb => cb.checked = false);
    
    // Trigger the filter update to actually clear the data filter
    updateListFilter(filterId, filterName);
}

function filterDropdownOptions(filterId) {
    const searchInput = document.getElementById(filterId + '_search');
    const options = document.querySelectorAll(`#${filterId}_options .filter-item`);
    const searchTerm = searchInput.value.toLowerCase();
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

function clearAllFilters() {
    window.currentFilters = {};
    
    // Clear all filter inputs
    document.querySelectorAll('[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('[type="number"]').forEach(input => input.value = '');
    document.querySelectorAll('[type="date"]').forEach(input => input.value = '');
    document.querySelectorAll('[id$="_display"]').forEach(display => {
        const filterName = display.id.replace('_display', '').replace('filter_', '').replace(/_/g, ' ');
        display.textContent = `Select ${filterName}`;
    });
    
    window.dashboard?.updateDashboardData() || updateDashboardData();
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.filter-component')) {
        document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
    }
});

// Backward compatibility function
function updateDashboardData() {
    if (typeof updateAllKPIs === 'function') updateAllKPIs();
    if (typeof updateAllCharts === 'function') updateAllCharts();
    console.log('Current filters:', window.currentFilters);
}
