/**
 * Data Modal Module
 * Handles the data viewer modal functionality with enhanced UI/UX
 */

// Data Modal Functions
let filteredData = [];
let allData = [];
let sortColumn = null;
let sortDirection = 'asc';

function openDataModal() {
    // Store all data for modal - use CSV loader data if available
    if (window.csvLoader && window.csvLoader.isLoaded()) {
        allData = [...window.csvLoader.getData()];
    } else if (window.dashboardData) {
        allData = [...window.dashboardData];
    } else {
        allData = [];
    }
    filteredData = [...allData];
    
    // Set modal title with filename
    const dataSpan = document.querySelector('span[onclick="openDataModal()"]');
    if (dataSpan) {
        const filename = dataSpan.textContent.replace('Data: ', '');
        document.getElementById('modalTitle').textContent = filename;
    }
    
    // Show modal with animation
    const modal = document.getElementById('dataModal');
    modal.classList.remove('hidden');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
    }, 10);
    
    // Initialize data table
    initializeDataTable();
    
    // Focus search input
    setTimeout(() => {
        const searchInput = document.getElementById('dataSearch');
        if (searchInput) searchInput.focus();
    }, 100);
}

function closeDataModal() {
    const modal = document.getElementById('dataModal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('opacity-100', 'opacity-0');
    }, 200);
}

function initializeDataTable() {
    if (allData.length === 0) {
        showEmptyState();
        return;
    }
    
    // Get column names
    const columns = Object.keys(allData[0]);
    
    // Update counts with better formatting
    document.getElementById('dataRowCount').textContent = `(${allData.length.toLocaleString()} rows)`;
    
    // Create table header with improved sorting icons
    const headerRow = document.getElementById('dataTableHeader');
    headerRow.innerHTML = columns.map(col => {
        const formattedCol = col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' ');
        const isSorted = sortColumn === col;
        const isAsc = isSorted && sortDirection === 'asc';
        const isDesc = isSorted && sortDirection === 'desc';
        
        return `
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors duration-150" 
                onclick="sortTable('${col}')">
                <div class="flex items-center justify-between">
                    <span>${formattedCol}</span>
                    <div class="flex items-center space-x-1">
                        ${isSorted ? `
                            <span class="text-xs text-blue-600 font-medium">
                                ${isAsc ? '↑' : '↓'}
                            </span>
                        ` : `
                            <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
                            </svg>
                        `}
                    </div>
                </div>
            </th>
        `;
    }).join('');
    
    // Render all data (no pagination)
    renderAllData();
}

function showEmptyState() {
    const tbody = document.getElementById('dataTableBody');
    const colCount = document.getElementById('dataTableHeader').children.length;
    tbody.innerHTML = `
        <tr>
            <td colspan="${colCount}" class="px-6 py-12 text-center">
                <div class="flex flex-col items-center space-y-4">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <div class="text-gray-500">
                        <p class="text-lg font-medium">No data available</p>
                        <p class="text-sm">The dataset appears to be empty or failed to load.</p>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function renderAllData() {
    const tbody = document.getElementById('dataTableBody');
    if (filteredData.length === 0) {
        showEmptyState();
        return;
    }
    
    tbody.innerHTML = filteredData.map((row, index) => {
        const cells = Object.values(row).map(value => 
            `<td class="px-4 py-3 text-sm text-gray-900 border-b border-gray-100">${formatCellValue(value)}</td>`
        ).join('');
        return `<tr class="hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">${cells}</tr>`;
    }).join('');
    
    // Update data info in header
    document.getElementById('dataRowCount').textContent = `(${filteredData.length.toLocaleString()} rows)`;
}

function formatCellValue(value) {
    if (value === null || value === undefined) return '<span class="text-gray-400 italic">—</span>';
    if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
    }
    if (typeof value === 'string' && value.length > 50) {
        return `<span title="${value.replace(/"/g, '&quot;')}">${value.substring(0, 50)}...</span>`;
    }
    return String(value);
}

function filterDataTable() {
    const searchTerm = document.getElementById('dataSearch').value.toLowerCase();
    
    if (searchTerm === '') {
        filteredData = [...allData];
    } else {
        filteredData = allData.filter(row => {
            return Object.values(row).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
    }
    
    // Apply current sorting if any
    if (sortColumn) {
        sortData(sortColumn, sortDirection);
        updateSortHeaders();
    }
    
    renderAllData();
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    sortData(column, sortDirection);
    updateSortHeaders();
    renderAllData();
}

function updateSortHeaders() {
    const headerRow = document.getElementById('dataTableHeader');
    if (!headerRow) return;
    
    const headers = headerRow.querySelectorAll('th');
    headers.forEach(header => {
        const columnName = header.getAttribute('onclick')?.match(/sortTable\('([^']+)'\)/)?.[1];
        if (!columnName) return;
        
        const iconContainer = header.querySelector('.flex.items-center.space-x-1');
        if (!iconContainer) return;
        
        const isSorted = sortColumn === columnName;
        const isAsc = isSorted && sortDirection === 'asc';
        const isDesc = isSorted && sortDirection === 'desc';
        
        iconContainer.innerHTML = isSorted ? `
            <span class="text-xs text-blue-600 font-medium">
                ${isAsc ? '↑' : '↓'}
            </span>
        ` : `
            <svg class="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/>
            </svg>
        `;
    });
}

function sortData(column, direction) {
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        // Convert to strings for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        
        if (direction === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });
}

// Pagination functions removed for cleaner, minimal design

function exportData() {
    // Create CSV content
    if (filteredData.length === 0) {
        alert('No data to export');
        return;
    }
    
    const columns = Object.keys(filteredData[0]);
    const csvContent = [
        columns.join(','),
        ...filteredData.map(row => 
            columns.map(col => {
                const value = row[col];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    // Create and download file with better naming
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `dashboard_data_${timestamp}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show success message
    showNotification('Data exported successfully!', 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg transition-all duration-300 transform translate-x-full ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('dataModal');
    if (event.target === modal) {
        closeDataModal();
    }
});

// Enhanced keyboard shortcuts
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('dataModal');
    if (modal.classList.contains('hidden')) return;
    
    switch(event.key) {
        case 'Escape':
            closeDataModal();
            break;
        // Arrow key navigation removed (no pagination)
        case 'f':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                const searchInput = document.getElementById('dataSearch');
                if (searchInput) searchInput.focus();
            }
            break;
        case 'e':
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                exportData();
            }
            break;
    }
});
