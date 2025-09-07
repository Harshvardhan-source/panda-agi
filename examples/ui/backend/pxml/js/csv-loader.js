/**
 * CSV Loader Module
 * 
 * Centralized CSV loading and parsing functionality for dashboard components.
 * This module handles dynamic CSV loading from the server and provides
 * parsed data to other dashboard components.
 */

class CSVLoader {
    constructor() {
        this.csvData = null;
        this.columnMapping = {};
        this.loading = false;
        this.loaded = false;
        this.loadPromise = null;
    }

    /**
     * Load CSV data from the specified file path
     * @param {string} filePath - Path to the CSV file
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Parsed CSV data
     */
    async loadCSV(filePath, options = {}) {
        // If already loading, return the existing promise
        if (this.loading && this.loadPromise) {
            return this.loadPromise;
        }

        // If already loaded, return cached data
        if (this.loaded && this.csvData) {
            return this.csvData;
        }

        this.loading = true;
        this.loadPromise = this._performLoad(filePath, options);
        
        try {
            const result = await this.loadPromise;
            this.loaded = true;
            this.loading = false;
            return result;
        } catch (error) {
            this.loading = false;
            throw error;
        }
    }

    /**
     * Perform the actual CSV loading
     * @param {string} filePath - Path to the CSV file
     * @param {Object} options - Loading options
     * @returns {Promise<Array>} Parsed CSV data
     */
    async _performLoad(filePath, options) {
        try {
            // Always fetch CSV from server to ensure we have the latest data
            const csvData = await this.fetchCSVFromServer(filePath);
            this.csvData = csvData;
            this.columnMapping = this.generateColumnMapping(csvData);
            return csvData;
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.csvData = [];
            this.columnMapping = {};
            throw error;
        }
    }

    /**
     * Fetch CSV data from the server
     * @param {string} filePath - Path to the CSV file
     * @returns {Promise<Array>} Parsed CSV data
     */
    async fetchCSVFromServer(filePath) {
        try {
            // Get conversation ID from URL or use a default
            const conversationId = this.getConversationId();
            
            // Construct the API endpoint URL
            const fileUrl = encodeURIComponent(filePath);
            
            const response = await fetch(fileUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            
            // Parse CSV data
            const csvData = this.parseCSV(csvText);
            
            return csvData;
        } catch (error) {
            console.error('Error fetching CSV from server:', error);
            throw error;
        }
    }

    /**
     * Parse CSV text into array of objects
     * @param {string} csvText - Raw CSV text
     * @returns {Array} Parsed CSV data
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            return [];
        }
        
        // Get headers from first line
        const headers = this.parseCSVLine(lines[0]);
        
        // Parse data rows
        const data = [];
        let skippedRows = 0;
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            } else {
                skippedRows++;
            }
        }
        
        return data;
    }

    /**
     * Parse a single CSV line, handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Parsed values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Generate column mapping from CSV data
     * @param {Array} csvData - Parsed CSV data
     * @returns {Object} Column mapping (A -> column_name, B -> column_name, etc.)
     */
    generateColumnMapping(csvData) {
        if (!csvData || csvData.length === 0) {
            return {};
        }

        const headers = Object.keys(csvData[0]);
        const mapping = {};
        
        headers.forEach((header, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, etc.
            mapping[letter] = header;
        });
        
        return mapping;
    }

    /**
     * Get conversation ID from config, URL, or use default
     * @returns {string} Conversation ID
     */
    getConversationId() {
        // Try to get from dashboard config first
        if (window.dashboardConfig && window.dashboardConfig.conversation_id) {
            return window.dashboardConfig.conversation_id;
        }
        
        // Try to extract conversation ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const conversationId = urlParams.get('conversation_id');
        
        if (conversationId) {
            return conversationId;
        }
        
        // Try to get from window object if available
        if (window.conversationId) {
            return window.conversationId;
        }
        
        // Use a default fallback
        return 'default';
    }

    /**
     * Get column data from CSV
     * @param {string} columnName - Name of the column
     * @param {number} startRow - Starting row (1-based)
     * @returns {Array} Column data
     */
    getColumnData(columnName, startRow = 1) {
        if (!this.csvData || this.csvData.length === 0) {
            return [];
        }

        // Since csvData doesn't include the header row, adjust startRow accordingly
        const startIndex = Math.max(0, startRow - 2);
        const result = this.csvData.slice(startIndex).map(row => row[columnName]);
        return result;
    }

    /**
     * Get cell value from CSV
     * @param {string} columnName - Name of the column
     * @param {number} rowIndex - Row index (0-based)
     * @returns {*} Cell value
     */
    getCellValue(columnName, rowIndex) {
        if (!this.csvData || !this.csvData[rowIndex]) {
            return null;
        }
        return this.csvData[rowIndex][columnName];
    }

    /**
     * Get the current CSV data
     * @returns {Array} Current CSV data
     */
    getData() {
        return this.csvData || [];
    }

    /**
     * Get the current column mapping
     * @returns {Object} Current column mapping
     */
    getColumnMapping() {
        return this.columnMapping || {};
    }

    /**
     * Check if CSV data is loaded
     * @returns {boolean} True if data is loaded
     */
    isLoaded() {
        return this.loaded && this.csvData && this.csvData.length > 0;
    }

    /**
     * Reset the loader state
     */
    reset() {
        this.csvData = null;
        this.columnMapping = {};
        this.loading = false;
        this.loaded = false;
        this.loadPromise = null;
    }
}

// Create global instance
window.csvLoader = new CSVLoader();
