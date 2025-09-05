/**
 * Dashboard Core Module
 * Handles initialization, data management, and coordination between components
 */

class DashboardCore {
    constructor() {
        this.config = null;
        this.currentFilters = {};
        this.registeredKPIs = {};
        this.registeredCharts = {};
        this.filterToColumnMap = {};
    }

    /**
     * Initialize the dashboard with configuration
     */
    initialize(config) {
        this.config = config;
        this.setupGlobalData();
        this.initializeComponents();
        this.updateDashboardData();
    }

    /**
     * Setup global data and mappings
     */
    setupGlobalData() {
        // Set up global variables for backward compatibility
        window.dashboardData = this.config.data.csv_data;
        window.currentFilters = this.currentFilters;
        window.columnMapping = this.config.data.column_mapping;
        window.registeredKPIs = this.registeredKPIs;
        window.registeredCharts = this.registeredCharts;
        window.filterToColumnMap = this.config.filter_to_column_mapping;

        // Debug helper function
        window.debugDashboard = () => {
            console.log('Dashboard Debug Info:');
            console.log('Total records:', window.dashboardData ? window.dashboardData.length : 0);
            console.log('Column mapping:', window.columnMapping);
            console.log('Filter to column mapping:', window.filterToColumnMap);
            console.log('Current filters:', window.currentFilters);
            console.log('Sample record:', window.dashboardData ? window.dashboardData[0] : 'No data');
            const filtered = this.getFilteredData();
            console.log('Filtered records:', filtered.length);
            if (filtered.length > 0) {
                console.log('Sample filtered record:', filtered[0]);
            }
        };
    }

    /**
     * Initialize all dashboard components
     */
    initializeComponents() {
        // Initialize filters
        this.config.filters.forEach(filter => {
            this.initializeFilter(filter);
        });

        // Initialize KPIs and Charts from components
        this.config.components.forEach(component => {
            this.initializeComponent(component);
        });
    }

    /**
     * Initialize a single component recursively
     */
    initializeComponent(component) {
        if (component.type === 'kpi') {
            this.registerKPI(component.id, component);
        } else if (component.type === 'chart') {
            this.registerChart(component.id, component);
        } else if (component.type === 'row') {
            // Initialize all columns in the row
            component.columns.forEach(column => {
                column.content.forEach(content => {
                    this.initializeComponent(content);
                });
            });
        }
    }

    /**
     * Initialize a filter component
     */
    initializeFilter(filter) {
        try {
            const values = eval(filter.values_formula);
            if (filter.type === 'list') {
                window.initializeListFilter(filter.id, values || [], filter.name);
            } else if (filter.type === 'number_range') {
                window.initializeRangeFilter(filter.id, values || [], filter.name);
            } else if (filter.type === 'date_range') {
                window.initializeDateRangeFilter(filter.id, values || [], filter.name);
            }
        } catch (error) {
            console.error(`Error initializing filter ${filter.id}:`, error);
            if (filter.type === 'list') {
                window.initializeListFilter(filter.id, [], filter.name);
            } else if (filter.type === 'number_range') {
                window.initializeRangeFilter(filter.id, [], filter.name);
            } else if (filter.type === 'date_range') {
                window.initializeDateRangeFilter(filter.id, [], filter.name);
            }
        }
    }

    /**
     * Register and render a KPI
     */
    registerKPI(kpiId, config) {
        // Render the KPI card HTML first, then register
        window.renderKPICard(kpiId, config);
        
        // Store in local registry
        this.registeredKPIs[kpiId] = {
            formula: config.value_formula,
            formatType: config.format_type,
            unit: config.unit
        };
    }

    /**
     * Register and render a chart
     */
    registerChart(chartId, config) {
        // Render the chart card HTML first, then register
        window.renderChartCard(chartId, config);
    }

    /**
     * Update all dashboard data when filters change
     */
    updateDashboardData() {
        this.updateAllKPIs();
        this.updateAllCharts();
        console.log('Current filters:', this.currentFilters);
    }

    /**
     * Update all KPIs
     */
    updateAllKPIs() {
        Object.keys(this.registeredKPIs).forEach(kpiId => {
            window.updateKPI(kpiId);
        });
    }

    /**
     * Update all charts
     */
    updateAllCharts() {
        Object.keys(window.registeredCharts).forEach(chartId => {
            window.updateChart(chartId);
        });
    }

    /**
     * Get filtered data based on current filters
     */
    getFilteredData() {
        return window.getFilteredData();
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        window.clearAllFilters();
    }
}

// Create global dashboard instance
window.dashboard = new DashboardCore();
