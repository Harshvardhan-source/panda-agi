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
        
        // Always show skeleton loading initially
        this.initializeComponentsWithSkeleton();
        
        // Set up a listener for when CSV data becomes available
        this.setupDataListener();
    }

    /**
     * Set up a listener for CSV data availability
     */
    setupDataListener() {
        // Check periodically if CSV data is loaded
        const checkData = () => {
            if (window.csvLoader && window.csvLoader.isLoaded()) {
                // Data is loaded, transition to actual data
                this.transitionToData();
                this.updateDashboardData();
            } else {
                // Data not ready yet, check again in 100ms
                setTimeout(checkData, 100);
            }
        };
        
        // Start checking
        checkData();
    }

    /**
     * Setup global data and mappings
     */
    setupGlobalData() {
        // Set up global variables for backward compatibility
        // Use CSV loader data if available, otherwise use empty arrays
        window.dashboardData = window.csvLoader && window.csvLoader.isLoaded() 
            ? window.csvLoader.getData() 
            : [];
        window.currentFilters = this.currentFilters;
        window.columnMapping = window.csvLoader && window.csvLoader.isLoaded()
            ? window.csvLoader.getColumnMapping()
            : {};
        window.registeredKPIs = this.registeredKPIs;
        window.registeredCharts = this.registeredCharts;
        window.filterToColumnMap = this.config.filter_to_column_mapping || {};

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

        // Initialize KPIs and Charts from components using data attributes
        this.config.components.forEach(component => {
            this.initializeComponent(component);
        });

        // Re-render all components from their data attributes
        // This ensures components are self-contained and can be updated independently
        if (window.reRenderAllKPIComponents) {
            window.reRenderAllKPIComponents();
        }
        if (window.reRenderAllChartComponents) {
            window.reRenderAllChartComponents();
        }
    }

    /**
     * Initialize components with skeleton loading
     */
    initializeComponentsWithSkeleton() {
        // Initialize filters with skeleton loading
        this.config.filters.forEach(filter => {
            this.initializeFilter(filter, true);
        });

        // Initialize KPIs and Charts from components using data attributes with skeleton loading
        this.config.components.forEach(component => {
            this.initializeComponent(component, true);
        });
    }

    /**
     * Transition all components from skeleton to actual data
     */
    transitionToData() {
        // Transition filters
        this.config.filters.forEach(filter => {
            this.initializeFilter(filter, false);
        });

        // Transition KPIs and Charts
        this.config.components.forEach(component => {
            this.initializeComponent(component, false);
        });

        // Re-render all components from their data attributes
        if (window.reRenderAllKPIComponents) {
            window.reRenderAllKPIComponents();
        }
        if (window.reRenderAllChartComponents) {
            window.reRenderAllChartComponents();
        }
    }

    /**
     * Initialize a single component recursively
     */
    initializeComponent(component, isLoading = false) {
        if (component.type === 'row') {
            // Initialize all columns in the row
            component.columns.forEach(column => {
                column.content.forEach(content => {
                    this.initializeComponent(content, isLoading);
                });
            });
        } else if (component.type === 'kpi') {
            // Initialize KPI component
            const containerId = component.id + '_container';
            if (window.renderKPIFromDataAttributes) {
                window.renderKPIFromDataAttributes(containerId, isLoading);
            }
        } else if (component.type === 'chart') {
            // Initialize Chart component
            const containerId = component.id + '_container';
            if (window.renderChartFromDataAttributes) {
                window.renderChartFromDataAttributes(containerId, isLoading);
            }
        }
    }

    /**
     * Initialize a filter component
     */
    initializeFilter(filter, isLoading = false) {
        try {
            if (isLoading) {
                // Show skeleton loading
                if (filter.type === 'list') {
                    window.initializeListFilter(filter.id, [], filter.name, true);
                } else if (filter.type === 'number_range') {
                    window.initializeRangeFilter(filter.id, [], filter.name, true);
                } else if (filter.type === 'date_range') {
                    window.initializeDateRangeFilter(filter.id, [], filter.name, true);
                }
                return;
            }
            
            // Use dynamic filters system if available, otherwise fall back to eval
            let values = [];
            
            if (window.dynamicFilters && window.dynamicFilters.initialized) {
                // Use the dynamic filters system to compute values
                values = window.dynamicFilters.computeFilterValues(filter.values_formula);
            } else {
                // Fallback: try to eval the formula (for backward compatibility)
                try {
                    values = eval(filter.values_formula);
                } catch (evalError) {
                    console.warn(`Could not eval formula ${filter.values_formula}, using empty array`);
                    values = [];
                }
            }
            
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
     * Register and render a KPI (legacy method for backward compatibility)
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
     * Register and render a chart (legacy method for backward compatibility)
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

// Handle messages from parent window for real-time updates
window.addEventListener('message', (event) => {
    if (event.data.type === 'update-kpi-data-attributes') {
        const { kpiId, config } = event.data;
        
        // Update the KPI container with new data attributes
        const container = document.getElementById(kpiId);
        if (container) {
            // Update data attributes
            if (config.name !== undefined) {
                container.setAttribute('data-name', config.name);
            }
            if (config.fa_icon !== undefined) {
                container.setAttribute('data-fa-icon', config.fa_icon);
            }
            if (config.value_formula !== undefined) {
                container.setAttribute('data-value-formula', config.value_formula);
            }
            if (config.format_type !== undefined) {
                container.setAttribute('data-format-type', config.format_type);
            }
            if (config.unit !== undefined) {
                container.setAttribute('data-unit', config.unit);
            }
            
            // Trigger KPI update to recalculate with new formula
            if (window.updateKPI) {
                window.updateKPI(kpiId);
            }
        }
    }
});

// Create global dashboard instance
window.dashboard = new DashboardCore();
