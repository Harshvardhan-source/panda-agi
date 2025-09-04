/**
 * Chart Management Module
 * Handles chart registration, rendering, updates, and Chart.js integration
 */

// Chart card HTML template
function createChartCardHTML(chartId, config) {
    const chart_name = config.name;
    const chart_type = config.chart_type;
    
    // Generate top N filter for bar and horizontal_bar charts
    let topNFilterHTML = "";
    if (chart_type === "bar" || chart_type === "horizontal_bar") {
        topNFilterHTML = `
            <div id="${chartId}_top_n_container" class="mb-3" style="display: none;">
                <select id="${chartId}_top_n" class="text-sm border border-gray-300 rounded px-2 py-1 bg-white" onchange="updateChartTopN('${chartId}')">
                    <option value="0">All</option>
                    <option value="5">Top 5</option>
                    <option value="10" selected>Top 10</option>
                </select>
            </div>`;
    }
    
    return `
        <div class="bg-white rounded-lg shadow-sm border p-6 chart-component h-full flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <h3 id="${chartId}_title" class="text-lg font-semibold text-gray-900 chart-title" data-chart-id="${chartId}">${chart_name}</h3>
                <div class="flex items-center space-x-2">
                    ${topNFilterHTML}
                </div>
            </div>
            <div class="relative flex-1 min-h-80" style="max-height: 400px; max-width: 100%; overflow: hidden;">
                <canvas id="${chartId}_canvas" class="w-full h-full" style="max-width: 100%; max-height: 100%;"></canvas>
                <div id="${chartId}_loading" class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p class="text-sm text-gray-600">Loading chart...</p>
                    </div>
                </div>
            </div>
        </div>`;
}

// Chart Management Functions
function renderChartCard(chartId, config) {
    const container = document.getElementById(chartId + '_container');
    if (!container) {
        console.error('❌ Chart container not found:', chartId + '_container');
        return;
    }
    
    // Render the chart card HTML
    const html = createChartCardHTML(chartId, config);
    container.innerHTML = html;
    
    // Register the chart
    registerChart(chartId, config);
}

function registerChart(chartId, config) {
    window.registeredCharts[chartId] = {
        config: config,
        chartInstance: null,
        canvas: document.getElementById(chartId + '_canvas'),
        loadingElement: document.getElementById(chartId + '_loading')
    };
}

function updateChart(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    const { config, canvas, loadingElement } = chartInfo;
    if (!canvas) return;
    
    // Show loading
    loadingElement.style.display = 'flex';
    
    try {
        // Get filtered data
        const filteredData = getFilteredData();
        
        // Process data for chart
        const chartData = processChartData(filteredData, config);
        
        // Destroy existing chart
        if (chartInfo.chartInstance) {
            chartInfo.chartInstance.destroy();
        }
        
        // Create new chart
        const ctx = canvas.getContext('2d');
        const chartOptions = getChartOptions(config, chartData.labels);
        chartInfo.chartInstance = new Chart(ctx, {
            type: getChartJsType(config.chart_type),
            data: chartData,
            options: chartOptions
        });
        
        // Hide loading
        loadingElement.style.display = 'none';
        
    } catch (error) {
        console.error(`Error updating chart ${chartId}:`, error);
        loadingElement.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                <p class="text-sm text-red-600">Chart error</p>
            </div>
        `;
    }
}

function updateAllCharts() {
    Object.keys(window.registeredCharts).forEach(chartId => {
        updateChart(chartId);
    });
}

function processChartData(data, config) {
    const { x_axis, series_list, default_filter_conditions } = config;
    
    // Apply default filter conditions if they exist
    let filteredData = data;
    if (default_filter_conditions && Array.isArray(default_filter_conditions)) {
        filteredData = data.filter(row => {
            return default_filter_conditions.every(condition => {
                // Handle range conditions like "user_gender2:user_gender=\"Male\""
                const rangeConditionMatch = condition.match(/^([^:]+)2:([^=]+)=(.+)$/);
                if (rangeConditionMatch) {
                    const [, , columnName, value] = rangeConditionMatch;
                    const rowValue = row[columnName.trim()];
                    // Remove quotes and unescape escaped quotes
                    const compareValue = value.trim().replace(/\\"/g, '"').replace(/^["']|["']$/g, '');
                    return rowValue == compareValue;
                }
                
                // Parse simple condition like "error_code>0"
                const conditionMatch = condition.match(/^([^><=!]+)\s*([><=!]+)\s*(.+)$/);
                if (conditionMatch) {
                    const [, columnName, operator, value] = conditionMatch;
                    const rowValue = row[columnName.trim()];
                    const compareValue = isNaN(value) ? value.trim() : Number(value);
                    
                    switch (operator) {
                        case '>': return Number(rowValue) > compareValue;
                        case '>=': return Number(rowValue) >= compareValue;
                        case '<': return Number(rowValue) < compareValue;
                        case '<=': return Number(rowValue) <= compareValue;
                        case '=': return rowValue == compareValue;
                        case '!=': return rowValue != compareValue;
                        default: return true;
                    }
                }
                return true;
            });
        });
    }
    
    // Group data by x-axis column
    const grouped = {};
    filteredData.forEach(row => {
        const xValue = row[window.columnMapping[x_axis.column] || x_axis.column];
        if (!grouped[xValue]) {
            grouped[xValue] = [];
        }
        grouped[xValue].push(row);
    });
    
    // Generate labels and datasets
    let labels = Object.keys(grouped).sort();
    const datasets = [];
    
    // Automatically assign axes based on series characteristics
    const shouldUseDualAxes = series_list.length > 1 && (
        // Always use dual axes for combo charts
        config.chart_type === 'combo_chart' ||
        // Different units
        new Set(series_list.map(s => s.unit)).size > 1 ||
        // Different format types (percentage vs number, etc.)
        new Set(series_list.map(s => s.format)).size > 1 ||
        // Different aggregation types (count vs avg/sum/etc)
        (series_list.some(s => s.aggregation === 'count') && 
         series_list.some(s => s.aggregation !== 'count'))
    );
    
    series_list.forEach((series, index) => {
        // Automatically assign axis based on chart type
        if (shouldUseDualAxes && index > 0) {
            // For horizontal bar charts, secondary axis is x1 (top)
            // For vertical charts, secondary axis is y1 (right)
            series.axis = config.chart_type === 'horizontal_bar' ? 'x1' : 'y1';
        } else {
            // Primary axis is x for horizontal, y for vertical
            series.axis = config.chart_type === 'horizontal_bar' ? 'x' : 'y';
        }
        
        const columnName = window.columnMapping[series.column] || series.column;
        
        // Handle bubble chart data structure differently
        let seriesData;
        if (config.chart_type === 'bubble') {
            seriesData = labels.map((label, labelIndex) => {
                let groupData = grouped[label];
                
                // Apply filter condition if specified
                if (series.filter_condition) {
                    const [filterColumn, filterValue] = series.filter_condition.split('=');
                    const filterColumnName = window.columnMapping[filterColumn] || filterColumn;
                    groupData = groupData.filter(row => row[filterColumnName] === filterValue);
                }
                
                const values = groupData.map(row => Number(row[columnName]) || 0);
                let aggregatedValue = 0;
                
                switch (series.aggregation) {
                    case 'sum':
                        aggregatedValue = values.reduce((a, b) => a + b, 0);
                        break;
                    case 'avg':
                        aggregatedValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                        break;
                    case 'count':
                        aggregatedValue = values.length;
                        break;
                    case 'max':
                        aggregatedValue = Math.max(...values);
                        break;
                    case 'min':
                        aggregatedValue = Math.min(...values);
                        break;
                    default:
                        aggregatedValue = values.reduce((a, b) => a + b, 0);
                }
                
                // For bubble charts: x = labelIndex, y = series value, r = bubble size based on data count
                return {
                    x: labelIndex,
                    y: aggregatedValue,
                    r: Math.max(5, Math.min(30, values.length * 3 + 5))  // Radius 5-30 based on data count
                };
            });
        } else {
            seriesData = labels.map(label => {
            let groupData = grouped[label];
            
            // Apply filter condition if specified
            if (series.filter_condition) {
                const [filterColumn, filterValue] = series.filter_condition.split('=');
                const filterColumnName = window.columnMapping[filterColumn] || filterColumn;
                groupData = groupData.filter(row => row[filterColumnName] === filterValue);
            }
            
            const values = groupData.map(row => Number(row[columnName]) || 0);
            
            switch (series.aggregation) {
                case 'sum':
                    return values.reduce((a, b) => a + b, 0);
                case 'avg':
                    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                case 'count':
                    return values.length;
                case 'max':
                    return Math.max(...values);
                case 'min':
                    return Math.min(...values);
                default:
                    return values.reduce((a, b) => a + b, 0);
            }
            });
        }
        
        // Comprehensive color palette with 20 distinct, accessible colors
        const colors = [
            // Primary blues and teals
            'rgba(59, 130, 246, 0.8)',   // Blue 500
            'rgba(16, 185, 129, 0.8)',   // Emerald 500
            'rgba(14, 165, 233, 0.8)',   // Sky 500
            'rgba(6, 182, 212, 0.8)',    // Cyan 500
            
            // Warm colors
            'rgba(245, 158, 11, 0.8)',   // Amber 500
            'rgba(249, 115, 22, 0.8)',   // Orange 500
            'rgba(239, 68, 68, 0.8)',    // Red 500
            'rgba(251, 191, 36, 0.8)',   // Yellow 400
            
            // Purples and pinks
            'rgba(139, 92, 246, 0.8)',   // Violet 500
            'rgba(168, 85, 247, 0.8)',   // Purple 500
            'rgba(236, 72, 153, 0.8)',   // Pink 500
            'rgba(244, 63, 94, 0.8)',    // Rose 500
            
            // Greens
            'rgba(34, 197, 94, 0.8)',    // Green 500
            'rgba(101, 163, 13, 0.8)',   // Lime 600
            'rgba(22, 163, 74, 0.8)',    // Green 600
            'rgba(5, 150, 105, 0.8)',    // Emerald 600
            
            // Additional distinctive colors
            'rgba(99, 102, 241, 0.8)',   // Indigo 500
            'rgba(217, 70, 239, 0.8)',   // Fuchsia 500
            'rgba(245, 101, 101, 0.8)',  // Red 400
            'rgba(52, 211, 153, 0.8)',   // Emerald 400
            
            // Muted alternatives for overflow
            'rgba(156, 163, 175, 0.8)',  // Gray 400
            'rgba(107, 114, 128, 0.8)',  // Gray 500
            'rgba(75, 85, 99, 0.8)',     // Gray 600
            'rgba(55, 65, 81, 0.8)'      // Gray 700
        ];
        
        // For pie/donut charts, assign different colors to each segment
        let backgroundColor, borderColor;
        if (['pie', 'donut'].includes(config.chart_type)) {
            backgroundColor = seriesData.map((_, i) => colors[i % colors.length]);
            borderColor = seriesData.map((_, i) => colors[i % colors.length].replace('0.8', '1'));
        } else if (['bar', 'horizontal_bar'].includes(config.chart_type) && config.chart_type !== 'bubble' && seriesData.some(val => val < 0) && seriesData.some(val => val > 0)) {
            // For bar charts with negative values, use green for positive and red for negative
            backgroundColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'); // Green for positive, red for negative
            borderColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)');
        } else {
            backgroundColor = colors[index % colors.length];
            borderColor = colors[index % colors.length].replace('0.8', '1');
        }
        
        const axisProperty = config.chart_type === 'horizontal_bar' ? 'xAxisID' : 'yAxisID';
        const dataset = {
            label: series.name,
            data: seriesData,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2,
            fill: config.area || false
        };
        
        // Handle combo charts: first series is bar, others are line
        if (config.chart_type === 'combo_chart') {
            if (index === 0) {
                dataset.type = 'bar';
            } else {
                dataset.type = 'line';
                dataset.fill = false; // Lines should not be filled by default
            }
        }
        
        // Assign axis ID for dual axis support
        if (config.chart_type === 'horizontal_bar') {
            dataset.xAxisID = series.axis || 'x';
        } else if (config.chart_type === 'bubble') {
            // For bubble charts, only assign yAxisID (x-axis is always the same)
            dataset.yAxisID = series.axis || 'y';
        } else {
            dataset.yAxisID = series.axis || 'y';
        }
        
        datasets.push(dataset);
    });
    
    // Handle top N filtering for bar and horizontal_bar charts
    if (['bar', 'horizontal_bar'].includes(config.chart_type)) {
        // Store original count for filter visibility decision
        const originalLabelCount = labels.length;
        
        // Show/hide top N filter based on data count
        const chartId = Object.keys(window.registeredCharts).find(id => 
            window.registeredCharts[id].config === config);
        if (chartId) {
            updateTopNFilterVisibility(chartId, config, originalLabelCount);
        }
        
        // Apply top N filtering
        if (config.top_n > 0 && labels.length > config.top_n) {
            // Sort by the first series data to get top N
            if (datasets.length > 0) {
                const sortedIndices = datasets[0].data
                    .map((value, index) => ({ value, index }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, config.top_n)
                    .map(item => item.index);
                
                labels = sortedIndices.map(i => labels[i]);
                datasets.forEach(dataset => {
                    dataset.data = sortedIndices.map(i => dataset.data[i]);
                });
            }
        }
    }
    
    // Handle 100% stacked charts by converting data to percentages
    if (config.style === '100% stacked' && datasets.length > 1) {
        const dataLength = labels.length;
        for (let i = 0; i < dataLength; i++) {
            // Calculate total for this data point across all series
            const total = datasets.reduce((sum, dataset) => {
                return sum + (dataset.data[i] || 0);
            }, 0);
            
            // Convert each dataset value to percentage
            if (total > 0) {
                datasets.forEach(dataset => {
                    if (dataset.data[i] !== undefined) {
                        dataset.data[i] = (dataset.data[i] / total) * 100;
                    }
                });
            }
        }
    }
    
    return { labels, datasets };
}

function getChartJsType(xmlType) {
    const typeMapping = {
        'bar': 'bar',
        'horizontal_bar': 'bar',
        'line': 'line',
        'pie': 'pie',
        'donut': 'doughnut',
        'bubble': 'bubble',
        'scatter': 'scatter',
        'radar': 'radar',
        'combo_chart': 'bar'
    };
    return typeMapping[xmlType] || 'bar';
}

function getChartOptions(config, labels) {
    // Provide fallback for labels if not provided
    labels = labels || [];
    
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false
            }
        },
        scales: {},
        onResize: function(chart, size) {
            // Ensure chart respects container bounds
            if (size.width > chart.canvas.parentNode.clientWidth) {
                chart.resize(chart.canvas.parentNode.clientWidth, size.height);
            }
        }
    };
    
    // Configure scales for bar, line, scatter, bubble, and combo charts
    if (['bar', 'horizontal_bar', 'line', 'scatter', 'bubble', 'combo_chart'].includes(config.chart_type)) {
        
        // Special handling for bubble charts
        if (config.chart_type === 'bubble') {
            // Check if bubble charts need dual axes
            const bubbleHasDualAxes = config.series_list.length > 1 && (
                new Set(config.series_list.map(s => s.unit)).size > 1 ||
                new Set(config.series_list.map(s => s.format)).size > 1
            );
            
            options.scales.x = {
                type: 'linear',
                title: {
                    display: true,
                    text: config.x_axis.name
                },
                ticks: {
                    stepSize: 1,
                    callback: function(value, index) {
                        // Show category labels instead of numeric indices
                        return labels[value] || value;
                    }
                },
                min: 0,
                max: labels.length - 1
            };
            
            // Primary y-axis (left)
            const primaryBubbleSeries = config.series_list.filter(s => s.axis === 'y' || !s.axis || !bubbleHasDualAxes)[0];
            options.scales.y = {
                type: 'linear',
                title: {
                    display: true,
                    text: primaryBubbleSeries ? primaryBubbleSeries.name : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary y-axis (right) for bubble charts if needed
            if (bubbleHasDualAxes) {
                const secondaryBubbleSeries = config.series_list.filter(s => s.axis === 'y1')[0];
                if (secondaryBubbleSeries) {
                    options.scales.y1 = {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: secondaryBubbleSeries.name
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        }
                    };
                }
            }
            
            // Custom tooltip for bubble charts
            options.plugins.tooltip = {
                callbacks: {
                    title: function(tooltipItems) {
                        const item = tooltipItems[0];
                        const point = item.raw;
                        return labels[point.x] || `Category ${point.x}`;
                    },
                    label: function(context) {
                        const point = context.raw;
                        return `${context.dataset.label}: ${point.y} (observations: ${Math.round((point.r - 5) / 3)})`;
                    }
                }
            };
            
        } else {
        
        // Check if we need dual axes
        const hasSecondaryAxis = config.series_list.some(series => 
            series.axis === 'y1' || series.axis === 'x1');
        
        // Get series names for each axis
        const primarySeriesNames = config.series_list
            .filter(series => series.axis === 'y' || series.axis === 'x' || !series.axis)
            .map(series => series.name);
        const secondarySeriesNames = config.series_list
            .filter(series => series.axis === 'y1' || series.axis === 'x1')
            .map(series => series.name);
        
        if (config.chart_type === 'horizontal_bar') {
            options.indexAxis = 'y';
            
            // For horizontal bars: y-axis is categories, x-axis is values
            options.scales.y = {
                title: {
                    display: true,
                    text: config.x_axis.name
                }
            };
            
            // Primary x-axis (bottom)
            options.scales.x = {
                type: 'linear',
                display: true,
                position: 'bottom',
                title: {
                    display: true,
                    text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary x-axis (top) if needed
            if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'x1')) {
                const x1SeriesNames = config.series_list
                    .filter(series => series.axis === 'x1')
                    .map(series => series.name);
                options.scales.x1 = {
                    type: 'linear',
                    display: true,
                    position: 'top',
                    title: {
                        display: true,
                        text: x1SeriesNames.join(', ')
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                };
            }
        } else {
            // For vertical bars and lines: x-axis is categories, y-axis is values
            options.scales.x = {
                title: {
                    display: true,
                    text: config.x_axis.name
                }
            };
            
            // Primary y-axis (left)
            options.scales.y = {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                },
                beginAtZero: true
            };
            
            // Secondary y-axis (right) if needed
            if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'y1')) {
                const y1SeriesNames = config.series_list
                    .filter(series => series.axis === 'y1')
                    .map(series => series.name);
                options.scales.y1 = {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: y1SeriesNames.join(', ')
                    },
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false
                    }
                };
            }
        }
        
        // For stacked charts, disable dual axes and use single axis (but not for combo charts)
        if (config.style === 'stacked' && config.chart_type !== 'combo_chart') {
            options.scales.x.stacked = true;
            options.scales.y.stacked = true;
            // Remove secondary axis for stacked charts
            delete options.scales.y1;
            delete options.scales.x1;
        } else if (config.style === '100% stacked' && config.chart_type !== 'combo_chart') {
            options.scales.x.stacked = true;
            options.scales.y.stacked = true;
            if (config.chart_type === 'horizontal_bar') {
                options.scales.x.max = 100;
                options.scales.x.ticks = {
                    callback: function(value) {
                        return value + '%';
                    }
                };
            } else {
                options.scales.y.max = 100;
                options.scales.y.ticks = {
                    callback: function(value) {
                        return value + '%';
                    }
                };
            }
            options.plugins.tooltip = {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + context.formattedValue + '%';
                    }
                }
            };
            // Remove secondary axis for 100% stacked charts
            delete options.scales.y1;
            delete options.scales.x1;
        }
        }
    }
    
    // Remove scales for pie/donut charts
    if (['pie', 'donut'].includes(config.chart_type)) {
        delete options.scales;
    }
    
    return options;
}

// Chart Top N Filter Functions
function updateChartTopN(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    const selectElement = document.getElementById(chartId + '_top_n');
    const newTopN = parseInt(selectElement.value) || 0;
    
    // Update the chart config
    chartInfo.config.top_n = newTopN;
    
    // Track when user explicitly selects "All" 
    if (newTopN === 0) {
        chartInfo.config.userSelectedAll = true;
    } else {
        chartInfo.config.userSelectedAll = false;
    }
    
    // Update chart title to include (top x) indicator
    updateChartTitle(chartId, chartInfo.config);
    
    // Redraw the chart with new filter
    updateChart(chartId);
}

function updateChartTitle(chartId, config) {
    const titleElement = document.getElementById(chartId + '_title');
    if (!titleElement) return;
    
    let title = config.original_name;
    if (['bar', 'horizontal_bar'].includes(config.chart_type) && config.top_n > 0) {
        title += ` (top ${config.top_n})`;
    }
    
    titleElement.textContent = title;
}

function updateTopNFilterVisibility(chartId, config, totalLabels) {
    if (!['bar', 'horizontal_bar'].includes(config.chart_type)) return;
    
    const topNContainer = document.getElementById(chartId + '_top_n_container');
    if (!topNContainer) return;
    
    if (totalLabels > 10) {
        topNContainer.style.display = 'block';
        // Only auto-set to top 10 if this is the first time and user hasn't explicitly chosen
        if (config.top_n === 0 && !config.userSelectedAll) {
            config.top_n = 10;
            const selectElement = document.getElementById(chartId + '_top_n');
            if (selectElement) selectElement.value = '10';
        }
        // If user explicitly selected "All", respect that choice
        else if (config.userSelectedAll) {
            config.top_n = 0;
            const selectElement = document.getElementById(chartId + '_top_n');
            if (selectElement) selectElement.value = '0';
        }
    } else {
        topNContainer.style.display = 'none';
        config.top_n = 0;
        config.userSelectedAll = false; // Reset flag when filter not needed
        const selectElement = document.getElementById(chartId + '_top_n');
        if (selectElement) selectElement.value = '0';
    }
    
    // Update the chart title to reflect the current state
    updateChartTitle(chartId, config);
}

// Chart editing functions (hooks for future implementation)
function editChart(chartId) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    // Check if we're in an iframe and can send messages to parent
    if (window.parent && window.parent !== window) {
        // Send message to parent window (dashboard editor)
        window.parent.postMessage({ 
            type: "chart-edit", 
            chartId: chartId,
            config: chartInfo.config 
        }, "*");
    } else {
        // Fallback for standalone usage
        alert(`Chart editing will be implemented here for: ${chartInfo.config.name}`);
    }
}

function updateChartProperty(chartId, property, value) {
    const chartInfo = window.registeredCharts[chartId];
    if (!chartInfo) return;
    
    // Update chart config
    chartInfo.config[property] = value;
    
    // Update UI element if needed
    if (property === 'name') {
        const titleElement = document.getElementById(chartId + '_title');
        if (titleElement) {
            titleElement.textContent = value;
        }
    }
    
    // Re-render chart with new settings
    updateChart(chartId);
}

// Make functions globally available
window.renderChartCard = renderChartCard;
window.updateChart = updateChart;
window.updateChartTopN = updateChartTopN;
window.updateChartTitle = updateChartTitle;
window.editChart = editChart;
window.updateChartProperty = updateChartProperty;
