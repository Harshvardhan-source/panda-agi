/**
 * Data Modal Module
 * Handles the data viewer modal functionality
 */

// Data Modal Functions
let currentPage = 1;
let rowsPerPage = 25;
let filteredData = [];
let allData = [];

function openDataModal() {
    // Store all data for modal
    allData = [...window.dashboardData];
    filteredData = [...allData];
    
    // Set modal title with filename
    const dataSpan = document.querySelector('span[onclick="openDataModal()"]');
    if (dataSpan) {
        const filename = dataSpan.textContent.replace('Data: ', '');
        document.getElementById('modalTitle').textContent = filename;
    }
    
    // Show modal
    document.getElementById('dataModal').classList.remove('hidden');
    
    // Initialize data table
    initializeDataTable();
    
    // Update pagination
    updatePagination();
}

function closeDataModal() {
    document.getElementById('dataModal').classList.add('hidden');
}

function initializeDataTable() {
    if (allData.length === 0) return;
    
    // Get column names
    const columns = Object.keys(allData[0]);
    
    // Update counts
    document.getElementById('dataRowCount').textContent = allData.length;
    document.getElementById('dataColumnCount').textContent = columns.length;
    
    // Create table header
    const headerRow = document.getElementById('dataTableHeader');
    headerRow.innerHTML = columns.map(col => 
        `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${col}</th>`
    ).join('');
    
    // Render current page
    renderCurrentPage();
}

function renderCurrentPage() {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = pageData.map(row => {
        const cells = Object.values(row).map(value => 
            `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatCellValue(value)}</td>`
        ).join('');
        return `<tr class="hover:bg-gray-50">${cells}</tr>`;
    }).join('');
    
    // Update pagination info
    document.getElementById('showingStart').textContent = filteredData.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingEnd').textContent = endIndex;
    document.getElementById('totalRows').textContent = filteredData.length;
}

function formatCellValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
        return new Intl.NumberFormat('en-US').format(value);
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
    
    currentPage = 1;
    renderCurrentPage();
    updatePagination();
}

function updateRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    renderCurrentPage();
    updatePagination();
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderCurrentPage();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    
    // Update page info
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update button states
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function exportData() {
    // Create CSV content
    if (filteredData.length === 0) return;
    
    const columns = Object.keys(filteredData[0]);
    const csvContent = [
        columns.join(','),
        ...filteredData.map(row => 
            columns.map(col => {
                const value = row[col];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('dataModal');
    if (event.target === modal) {
        closeDataModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeDataModal();
    }
});
