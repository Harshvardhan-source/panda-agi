"""
HTML Generator for Dashboard

Generates HTML structure with Tailwind CSS for dashboard components, focusing on filters.
"""

from typing import Dict, List, Any, Optional
from .xml_parser import FilterSpec, DashboardMetadata, KPISpec, ChartSpec
from .formula_evaluator import FormulaEvaluator


class HTMLGenerator:
    """Generates HTML structure for dashboard components"""

    def __init__(self):
        self.formula_evaluator = FormulaEvaluator()

    def generate_dashboard_html(
        self,
        dashboard_data: Dict[str, Any],
        csv_data_json: str,
        column_mapping: Dict[str, str] = None,
    ) -> str:
        """Generate complete dashboard HTML"""
        metadata = dashboard_data["metadata"]
        filters = dashboard_data["filters"]

        # Use provided column mapping or extract from CSV data
        if column_mapping is None:
            column_mapping = self._extract_column_mapping_from_csv_data(csv_data_json)

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{metadata.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .filter-container {{
            max-height: 200px;
            overflow-y: auto;
        }}
        .filter-item {{
            cursor: pointer;
            transition: all 0.2s;
        }}
        .filter-item:hover {{
            background-color: rgb(243 244 246);
        }}
        .filter-item.selected {{
            background-color: rgb(59 130 246);
            color: white;
        }}
        .kpi-component {{
            transition: all 0.3s ease;
        }}
        .kpi-value {{
            transition: all 0.3s ease;
        }}
        .kpi-updating {{
            opacity: 0.6;
        }}
    </style>
</head>
<body class="bg-gray-50">
    <div class="min-h-screen">
        {self._generate_header(metadata)}
        {self._generate_filters_section(filters, column_mapping)}
        {self._generate_content_section(dashboard_data, column_mapping)}
    </div>
    
                {self._generate_scripts(csv_data_json, column_mapping, dashboard_data)}
</body>
</html>"""
        return html

    def _generate_header(self, metadata: DashboardMetadata) -> str:
        """Generate dashboard header"""
        return f"""
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <i class="fas {metadata.fa_icon} text-2xl text-blue-600"></i>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">{metadata.name}</h1>
                            <p class="text-sm text-gray-600">{metadata.description}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-500">
                        <i class="fas fa-database"></i>
                        <span class="cursor-pointer hover:text-blue-600 hover:underline" onclick="openDataModal()">Data: {metadata.file_path}</span>
                    </div>
                </div>
            </div>
        </header>
        {self._generate_data_modal()}"""

    def _generate_data_modal(self) -> str:
        """Generate data modal HTML"""
        return """
        <!-- Data Modal -->
        <div id="dataModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
            <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
                <div class="mt-3">
                    <!-- Modal Header -->
                    <div class="flex items-center justify-between pb-4 border-b">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-database text-2xl text-blue-600"></i>
                            <div>
                                <h3 id="modalTitle" class="text-lg font-semibold text-gray-900">Data File</h3>
                                <p class="text-sm text-gray-600">Complete dataset used in this dashboard</p>
                            </div>
                        </div>
                        <button onclick="closeDataModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <!-- Modal Content -->
                    <div class="mt-4">
                        <!-- Data Controls -->
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center space-x-4">
                                <div class="text-sm text-gray-600">
                                    <span id="dataRowCount">0</span> rows, <span id="dataColumnCount">0</span> columns
                                </div>
                                <div class="flex items-center space-x-2">
                                    <input type="text" id="dataSearch" placeholder="Search data..." 
                                           class="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                           onkeyup="filterDataTable()">
                                    <button onclick="exportData()" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                        <i class="fas fa-download mr-1"></i>Export
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2">
                                <label class="text-sm text-gray-600">Rows per page:</label>
                                <select id="rowsPerPage" class="px-2 py-1 text-sm border border-gray-300 rounded" onchange="updateRowsPerPage()">
                                    <option value="10">10</option>
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>
                        </div>
                        
                        <!-- Data Table Container -->
                        <div class="border border-gray-200 rounded-lg overflow-hidden">
                            <div class="overflow-x-auto max-h-96">
                                <table id="dataTable" class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50 sticky top-0">
                                        <tr id="dataTableHeader">
                                            <!-- Headers will be populated by JavaScript -->
                                        </tr>
                                    </thead>
                                    <tbody id="dataTableBody" class="bg-white divide-y divide-gray-200">
                                        <!-- Data rows will be populated by JavaScript -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Pagination -->
                        <div class="flex items-center justify-between mt-4">
                            <div class="text-sm text-gray-600">
                                Showing <span id="showingStart">0</span> to <span id="showingEnd">0</span> of <span id="totalRows">0</span> entries
                            </div>
                            <div class="flex items-center space-x-2">
                                <button id="prevPage" onclick="changePage(-1)" class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <i class="fas fa-chevron-left"></i> Previous
                                </button>
                                <span id="pageInfo" class="px-3 py-1 text-sm text-gray-600">Page 1 of 1</span>
                                <button id="nextPage" onclick="changePage(1)" class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                    Next <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>"""

    def _generate_filters_section(
        self, filters: List[FilterSpec], column_mapping: Dict[str, str]
    ) -> str:
        """Generate filters section"""
        if not filters:
            return ""

        filters_html = """
        <section class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                        <i class="fas fa-filter mr-2 text-blue-600"></i>
                        Filters
                    </h2>
                    <button onclick="clearAllFilters()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Clear All
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">"""

        for filter_spec in filters:
            filters_html += self._generate_filter_component(filter_spec, column_mapping)

        filters_html += """
                </div>
            </div>
        </section>"""

        return filters_html

    def _generate_filter_component(
        self, filter_spec: FilterSpec, column_mapping: Dict[str, str]
    ) -> str:
        """Generate individual filter component"""
        filter_id = f"filter_{filter_spec.name.lower().replace(' ', '_')}"

        if filter_spec.type == "list":
            return self._generate_list_filter(filter_spec, filter_id, column_mapping)
        elif filter_spec.type == "number_range":
            return self._generate_number_range_filter(
                filter_spec, filter_id, column_mapping
            )
        elif filter_spec.type == "date_range":
            return self._generate_date_range_filter(
                filter_spec, filter_id, column_mapping
            )
        else:
            return self._generate_list_filter(filter_spec, filter_id, column_mapping)

    def _generate_list_filter(
        self, filter_spec: FilterSpec, filter_id: str, column_mapping: Dict[str, str]
    ) -> str:
        """Generate list/dropdown filter"""
        js_formula = self.formula_evaluator.get_filter_values_js(
            filter_spec.values_formula, column_mapping
        )

        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_spec.name}</label>
            <div class="relative">
                <button 
                    id="{filter_id}_button"
                    onclick="toggleFilterDropdown('{filter_id}')"
                    class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between">
                    <span id="{filter_id}_display" class="text-gray-700">Select {filter_spec.name}</span>
                    <i class="fas fa-chevron-down text-gray-400"></i>
                </button>
                <div 
                    id="{filter_id}_dropdown"
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg hidden">
                    <div class="p-2 border-b">
                        <input 
                            type="text"
                            id="{filter_id}_search"
                            placeholder="Search..."
                            class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onkeyup="filterDropdownOptions('{filter_id}')">
                    </div>
                    <div class="filter-container p-1" id="{filter_id}_options">
                        <!-- Options will be populated by JavaScript -->
                    </div>
                    <div class="p-2 border-t bg-gray-50 flex justify-end">
                        <button 
                            onclick="clearFilterSelection('{filter_id}', '{filter_spec.name}')"
                            class="text-xs text-red-600 hover:text-red-800">Clear</button>
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Initialize filter values for {filter_id}
            document.addEventListener('DOMContentLoaded', function() {{
                try {{
                    const values = {js_formula};
                    initializeListFilter('{filter_id}', values || [], '{filter_spec.name}');
                }} catch (error) {{
                    console.error('Error initializing filter {filter_id}:', error);
                    initializeListFilter('{filter_id}', [], '{filter_spec.name}');
                }}
            }});
        </script>"""

    def _generate_number_range_filter(
        self, filter_spec: FilterSpec, filter_id: str, column_mapping: Dict[str, str]
    ) -> str:
        """Generate number range filter"""
        js_formula = self.formula_evaluator.get_filter_values_js(
            filter_spec.values_formula, column_mapping
        )

        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_spec.name}</label>
            <div class="grid grid-cols-2 gap-2">
                <div>
                                            <input 
                            type="number"
                            id="{filter_id}_min"
                            placeholder="Min"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onblur="validateAndUpdateRangeFilter('{filter_id}', '{filter_spec.name}', 'min')"
                            onchange="validateAndUpdateRangeFilter('{filter_id}', '{filter_spec.name}', 'min')">
                </div>
                <div>
                                            <input 
                            type="number"
                            id="{filter_id}_max"
                            placeholder="Max"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onblur="validateAndUpdateRangeFilter('{filter_id}', '{filter_spec.name}', 'max')"
                            onchange="validateAndUpdateRangeFilter('{filter_id}', '{filter_spec.name}', 'max')">
                </div>
            </div>
            <div class="mt-1 text-xs text-gray-500" id="{filter_id}_range_info">
                Range: <span id="{filter_id}_min_val">-</span> to <span id="{filter_id}_max_val">-</span>
            </div>
        </div>
        <script>
            // Initialize range filter for {filter_id}
            document.addEventListener('DOMContentLoaded', function() {{
                try {{
                    const values = {js_formula};
                    initializeRangeFilter('{filter_id}', values || [], '{filter_spec.name}');
                }} catch (error) {{
                    console.error('Error initializing range filter {filter_id}:', error);
                    initializeRangeFilter('{filter_id}', [], '{filter_spec.name}');
                }}
            }});
        </script>"""

    def _generate_date_range_filter(
        self, filter_spec: FilterSpec, filter_id: str, column_mapping: Dict[str, str]
    ) -> str:
        """Generate date range filter"""
        js_formula = self.formula_evaluator.get_filter_values_js(
            filter_spec.values_formula, column_mapping
        )

        return f"""
        <div class="filter-component">
            <label class="block text-sm font-medium text-gray-700 mb-2">{filter_spec.name}</label>
            <div class="grid grid-cols-2 gap-2">
                <div>
                                            <input 
                            type="date"
                            id="{filter_id}_start"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onblur="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_spec.name}', 'start')"
                            onchange="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_spec.name}', 'start')">
                </div>
                <div>
                                            <input 
                            type="date"
                            id="{filter_id}_end"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            onblur="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_spec.name}', 'end')"
                            onchange="validateAndUpdateDateRangeFilter('{filter_id}', '{filter_spec.name}', 'end')">
                </div>
            </div>
        </div>
        <script>
            // Initialize date range filter for {filter_id}
            document.addEventListener('DOMContentLoaded', function() {{
                try {{
                    const values = {js_formula};
                    initializeDateRangeFilter('{filter_id}', values || [], '{filter_spec.name}');
                }} catch (error) {{
                    console.error('Error initializing date range filter {filter_id}:', error);
                    initializeDateRangeFilter('{filter_id}', [], '{filter_spec.name}');
                }}
            }});
        </script>"""

    def _generate_content_section(
        self, dashboard_data: Dict[str, Any], column_mapping: Dict[str, str]
    ) -> str:
        """Generate main dashboard content including KPIs"""
        grid_data = dashboard_data.get("grid", {})

        content_html = """
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">"""

        # Generate grid rows
        for row_data in grid_data.get("rows", []):
            content_html += self._generate_grid_row(row_data, column_mapping)

        content_html += """
        </main>"""

        return content_html

    def _generate_grid_row(
        self, row_data: Dict[str, Any], column_mapping: Dict[str, str]
    ) -> str:
        """Generate a grid row with columns"""
        columns = row_data.get("columns", [])

        # Calculate total size for proportional widths
        total_size = sum(int(col.get("size", "1")) for col in columns)

        # Generate unique row ID for CSS targeting
        import uuid

        row_id = f"row_{uuid.uuid4().hex[:8]}"

        row_html = f"""
            <div class="flex flex-col md:flex-row gap-6 mb-6 md:items-stretch" id="{row_id}">"""

        for i, column_data in enumerate(columns):
            row_html += self._generate_grid_column(
                column_data, column_mapping, total_size, row_id, i
            )

        row_html += """
            </div>"""

        return row_html

    def _generate_grid_column(
        self,
        column_data: Dict[str, Any],
        column_mapping: Dict[str, str],
        total_size: int,
        row_id: str,
        col_index: int,
    ) -> str:
        """Generate a grid column with its content"""
        size = int(column_data.get("size", "1"))

        # Calculate proportional flex grow value instead of fixed width
        flex_grow = size

        # Create unique column identifier
        col_id = f"{row_id}_col_{col_index}"

        # Use flex-grow for proportional sizing that works with gaps
        column_html = f"""
            <div class="w-full md:w-auto" id="{col_id}">
                <style>
                    @media (min-width: 768px) {{
                        #{col_id} {{ flex: {flex_grow} 1 0 !important; }}
                    }}
                </style>
                <div class="h-full flex flex-col">"""

        # Generate content for this column
        for content_item in column_data.get("content", []):
            if content_item["type"] == "kpi":
                column_html += self._generate_kpi_component(
                    content_item["spec"], column_mapping
                )
            elif content_item["type"] == "chart":
                column_html += self._generate_chart_component(
                    content_item["spec"], column_mapping
                )
            # Other content types can be added here later

        column_html += """
                </div>
            </div>"""

        return column_html

    def _generate_kpi_component(
        self, kpi_spec: KPISpec, column_mapping: Dict[str, str]
    ) -> str:
        """Generate KPI component HTML"""
        kpi_id = f"kpi_{kpi_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '')}"
        js_formula = self.formula_evaluator.convert_formula_to_js(
            kpi_spec.value_formula, column_mapping
        )

        return f"""
        <div class="bg-white rounded-lg shadow-sm border p-6 kpi-component h-full flex flex-col justify-center" id="{kpi_id}_container">
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <i class="fas {kpi_spec.fa_icon} text-blue-600 text-xl"></i>
                    </div>
                </div>
                <div class="ml-4 flex-1">
                    <h3 class="text-sm font-medium text-gray-900 mb-1">{kpi_spec.name}</h3>
                    <div class="flex items-baseline">
                        <span id="{kpi_id}_value" class="text-2xl font-bold text-gray-900 kpi-value">
                            Loading...
                        </span>
                        {f'<span class="ml-1 text-sm text-gray-500">{kpi_spec.unit}</span>' if kpi_spec.unit else ''}
                    </div>
                    <div id="{kpi_id}_change" class="text-xs text-gray-500 mt-1">
                        <!-- Change indicator will be added here -->
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Initialize KPI {kpi_id}
            document.addEventListener('DOMContentLoaded', function() {{
                registerKPI('{kpi_id}', '{js_formula}', '{kpi_spec.format_type}', '{kpi_spec.unit}');
                updateKPI('{kpi_id}');
            }});
        </script>"""

    def _generate_chart_component(
        self, chart_spec: ChartSpec, column_mapping: Dict[str, str]
    ) -> str:
        """Generate Chart component HTML"""
        chart_id = f"chart_{chart_spec.name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace('-', '_')}"

        # Generate top N filter for bar and horizontal_bar charts (will be shown/hidden dynamically)
        top_n_filter_html = ""
        chart_title = chart_spec.name
        if chart_spec.chart_type in ["bar", "horizontal_bar"]:
            top_n_filter_html = f"""
            <div id="{chart_id}_top_n_container" class="mb-3" style="display: none;">
                <select id="{chart_id}_top_n" class="text-sm border border-gray-300 rounded px-2 py-1 bg-white" onchange="updateChartTopN('{chart_id}')">
                    <option value="0">All</option>
                    <option value="5">Top 5</option>
                    <option value="10" selected>Top 10</option>
                </select>
            </div>"""

        return f"""
        <div class="bg-white rounded-lg shadow-sm border p-6 chart-component h-full flex flex-col" id="{chart_id}_container">
            <div class="flex justify-between items-start mb-4">
                <h3 id="{chart_id}_title" class="text-lg font-semibold text-gray-900">{chart_title}</h3>
                {top_n_filter_html}
            </div>
            <div class="relative flex-1 min-h-80">
                <canvas id="{chart_id}_canvas" class="w-full h-full"></canvas>
                <div id="{chart_id}_loading" class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded">
                    <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p class="text-sm text-gray-600">Loading chart...</p>
                    </div>
                </div>
            </div>
        </div>
        <script>
            // Initialize Chart {chart_id}
            document.addEventListener('DOMContentLoaded', function() {{
                const chartConfig = {{
                    type: '{chart_spec.chart_type}',
                    name: '{chart_spec.name}',
                    original_name: '{chart_spec.name}',
                    x_axis: {{
                        name: '{chart_spec.x_axis.name}',
                        column: '{chart_spec.x_axis.column}',
                        group_by: '{chart_spec.x_axis.group_by}'
                    }},
                    series_list: [
                        {self._generate_chart_series_config(chart_spec.series_list, column_mapping)}
                    ],
                    style: '{chart_spec.style}',
                    area: {str(chart_spec.area).lower()},
                    cumulative: {str(chart_spec.cumulative).lower()},
                    top_n: 0,  // Will be set dynamically based on data count
                    default_filter_conditions: {self._format_default_filter_conditions(chart_spec.default_filter_conditions, column_mapping) if chart_spec.default_filter_conditions else 'null'}
                }};
                registerChart('{chart_id}', chartConfig);
                updateChart('{chart_id}');
            }});
        </script>"""

    def _generate_chart_series_config(
        self, series_list, column_mapping: Dict[str, str]
    ) -> str:
        """Generate JavaScript config for chart series"""
        series_configs = []
        for series in series_list:
            config = f"""{{
                name: '{series.name}',
                column: '{series.column}',
                aggregation: '{series.aggregation}',
                format: '{series.format_type}',
                unit: '{series.unit}',
                filter_condition: '{series.filter_condition}',
                axis: '{series.axis}'
            }}"""
            series_configs.append(config)
        return ",\n                        ".join(series_configs)

    def _generate_filter_to_column_mapping(
        self, filters: List[FilterSpec], column_mapping: Dict[str, str]
    ) -> str:
        """Generate JavaScript object mapping filter names to actual column names and transformation functions"""
        import json

        mapping = {}
        reverse_column_mapping = {v: k for k, v in column_mapping.items()}

        for filter_spec in filters:
            filter_name = filter_spec.name
            # Try to determine the column name from the filter's values formula
            formula = filter_spec.values_formula

            # Handle computed filters with functions like YEAR(C2:C)
            import re

            # Check for YEAR function
            year_match = re.search(r"YEAR\(([A-Z]+)(?:\d*):?(?:[A-Z]+)?\)", formula)
            if year_match:
                col_letter = year_match.group(1)
                if col_letter in column_mapping:
                    # This is a computed filter that applies YEAR to a column
                    mapping[filter_name] = {
                        "column": column_mapping[col_letter],
                        "transform": "YEAR",
                    }
                    continue

            # Check if the formula contains direct column name references
            column_name_found = None

            # Look for column names that exist in our column mapping
            all_column_names = set(column_mapping.values())
            for col_name in all_column_names:
                if col_name in formula:
                    column_name_found = col_name
                    break

            if column_name_found:
                # Direct column name reference found
                mapping[filter_name] = column_name_found
            else:
                # Excel-style reference like A2:A, B:B, etc.
                # Extract column letter and map to column name
                col_match = re.search(r"([A-Z]+)(?:\d*):?(?:[A-Z]+)?", formula)
                if col_match:
                    col_letter = col_match.group(1)
                    column_name = column_mapping.get(col_letter, filter_name)
                    mapping[filter_name] = column_name
                else:
                    # Fallback: assume filter name matches column name
                    mapping[filter_name] = filter_name

        return json.dumps(mapping)

    def _format_default_filter_conditions(
        self, conditions: List[str], column_mapping: Dict[str, str]
    ) -> str:
        """Format default filter conditions as JavaScript array"""
        if not conditions:
            return "null"

        import re

        formatted_conditions = []
        for condition in conditions:
            # Convert Excel column references (like S>0, N2:N="Male") to column names
            js_condition = condition

            # Sort column letters by length (descending) to handle longer letters first
            # This prevents partial matches (e.g., 'A' replacing 'AA')
            sorted_columns = sorted(
                column_mapping.items(), key=lambda x: len(x[0]), reverse=True
            )

            for col_letter, col_name in sorted_columns:
                # Replace Excel patterns like N2:N, N:N, N>, N=, N<, N>=, etc.
                # This handles specific Excel range and comparison patterns
                patterns = [
                    r"\b"
                    + re.escape(col_letter)
                    + r"(\d+):"
                    + re.escape(col_letter)
                    + r"\b",  # N2:N
                    r"\b"
                    + re.escape(col_letter)
                    + r":"
                    + re.escape(col_letter)
                    + r"\b",  # N:N
                    r"\b" + re.escape(col_letter) + r"(?=\s*[><=!])",  # N> N= N< etc.
                    r"\b" + re.escape(col_letter) + r"(?=\s*$)",  # N at end
                ]

                for pattern in patterns:
                    if col_letter + "2:" + col_letter in condition:
                        # Special case for N2:N patterns - replace both instances
                        js_condition = re.sub(
                            col_letter + r"2:" + col_letter,
                            col_name + "2:" + col_name,
                            js_condition,
                        )
                    else:
                        js_condition = re.sub(pattern, col_name, js_condition)

            # Escape quotes in the condition to prevent JavaScript syntax errors
            escaped_condition = js_condition.replace('"', '\\"')
            formatted_conditions.append(f'"{escaped_condition}"')

        return "[" + ", ".join(formatted_conditions) + "]"

    def _generate_scripts(
        self,
        csv_data_json: str,
        column_mapping: Dict[str, str],
        dashboard_data: Dict[str, Any] = None,
    ) -> str:
        """Generate JavaScript code for dashboard functionality"""
        excel_helpers = self.formula_evaluator.generate_js_helper_functions()

        # Convert column mapping to JSON
        import json

        column_mapping_json = json.dumps(column_mapping)

        # Generate filter to column mapping
        if dashboard_data and "filters" in dashboard_data:
            filter_to_column_mapping = self._generate_filter_to_column_mapping(
                dashboard_data["filters"], column_mapping
            )
        else:
            filter_to_column_mapping = "{}"

        return f"""
    <script>
        // Global variables
        window.dashboardData = {csv_data_json};
        window.currentFilters = {{}};
        window.columnMapping = {column_mapping_json};
        window.registeredKPIs = {{}};
        window.registeredCharts = {{}};
        
        // Map filter names to actual column names in data
        window.filterToColumnMap = {filter_to_column_mapping};
        
        // Debug helper function
        window.debugDashboard = function() {{
            console.log('Dashboard Debug Info:');
            console.log('Total records:', window.dashboardData ? window.dashboardData.length : 0);
            console.log('Column mapping:', window.columnMapping);
            console.log('Filter to column mapping:', window.filterToColumnMap);
            console.log('Current filters:', window.currentFilters);
            console.log('Sample record:', window.dashboardData ? window.dashboardData[0] : 'No data');
            const filtered = getFilteredData();
            console.log('Filtered records:', filtered.length);
            if (filtered.length > 0) {{
                console.log('Sample filtered record:', filtered[0]);
            }}
        }};
        
        {excel_helpers}
        
        // Filter management functions
        function toggleFilterDropdown(filterId) {{
            const dropdown = document.getElementById(filterId + '_dropdown');
            const isHidden = dropdown.classList.contains('hidden');
            
            // Close all other dropdowns
            document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
            
            if (isHidden) {{
                dropdown.classList.remove('hidden');
            }}
        }}
        
        function initializeListFilter(filterId, values, filterName) {{
            const optionsContainer = document.getElementById(filterId + '_options');
            const uniqueValues = [...new Set(values)].sort();
            
            optionsContainer.innerHTML = uniqueValues.map(value => `
                <div class="filter-item px-2 py-1 text-sm rounded" 
                     onclick="toggleFilterOption('${{filterId}}', '${{value}}', '${{filterName}}')">
                    <input type="checkbox" id="${{filterId}}_${{value}}" class="mr-2">
                    <span>${{value}}</span>
                </div>
            `).join('');
        }}
        
        function initializeRangeFilter(filterId, values, filterName) {{
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
        }}
        
        function initializeDateRangeFilter(filterId, values, filterName) {{
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
        }}
        
        function toggleFilterOption(filterId, value, filterName) {{
            const checkbox = document.getElementById(`${{filterId}}_${{value}}`);
            checkbox.checked = !checkbox.checked;
            updateListFilter(filterId, filterName);
        }}
        
        function updateListFilter(filterId, filterName) {{
            const checkboxes = document.querySelectorAll(`[id^="${{filterId}}_"][type="checkbox"]`);
            const selectedValues = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.id.replace(filterId + '_', ''));
            
            if (selectedValues.length === 0) {{
                delete window.currentFilters[filterName];
                document.getElementById(filterId + '_display').textContent = `Select ${{filterName}}`;
            }} else {{
                window.currentFilters[filterName] = selectedValues;
                const displayText = selectedValues.length === 1 
                    ? selectedValues[0]
                    : `${{selectedValues.length}} selected`;
                document.getElementById(filterId + '_display').textContent = displayText;
            }}
            
            updateDashboardData();
            // Close dropdown
            document.getElementById(filterId + '_dropdown').classList.add('hidden');
        }}
        
        function validateAndUpdateRangeFilter(filterId, filterName, inputType) {{
            const minInput = document.getElementById(filterId + '_min');
            const maxInput = document.getElementById(filterId + '_max');
            const currentInput = inputType === 'min' ? minInput : maxInput;
            
            // Validate the current input against data bounds
            if (currentInput.value) {{
                const value = Number(currentInput.value);
                const dataMin = Number(currentInput.min);
                const dataMax = Number(currentInput.max);
                
                // Auto-correct values outside data bounds
                if (value < dataMin) {{
                    currentInput.value = dataMin;
                }} else if (value > dataMax) {{
                    currentInput.value = dataMax;
                }}
            }}
            
            const minVal = minInput.value ? Number(minInput.value) : undefined;
            const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
            
            // Ensure logical consistency (min <= max)
            if (minVal !== undefined && maxVal !== undefined) {{
                if (minVal > maxVal) {{
                    if (inputType === 'min') {{
                        maxInput.value = minVal;
                    }} else {{
                        minInput.value = maxVal;
                    }}
                }}
            }}
            
            // Update the filter
            updateRangeFilter(filterId, filterName);
        }}
        
        function updateRangeFilter(filterId, filterName) {{
            const minInput = document.getElementById(filterId + '_min');
            const maxInput = document.getElementById(filterId + '_max');
            const minVal = minInput.value ? Number(minInput.value) : undefined;
            const maxVal = maxInput.value ? Number(maxInput.value) : undefined;
            
            if (minVal !== undefined || maxVal !== undefined) {{
                window.currentFilters[filterName] = {{
                    min: minVal,
                    max: maxVal
                }};
            }} else {{
                delete window.currentFilters[filterName];
            }}
            
            updateDashboardData();
        }}
        
        function validateAndUpdateDateRangeFilter(filterId, filterName, inputType) {{
            const startInput = document.getElementById(filterId + '_start');
            const endInput = document.getElementById(filterId + '_end');
            const currentInput = inputType === 'start' ? startInput : endInput;
            
            if (!currentInput.value) {{
                updateDateRangeFilter(filterId, filterName);
                return;
            }}
            
            const value = currentInput.value;
            const dataMin = currentInput.min;
            const dataMax = currentInput.max;
            
            // Auto-correct values outside data bounds
            if (value < dataMin) {{
                currentInput.value = dataMin;
            }} else if (value > dataMax) {{
                currentInput.value = dataMax;
            }}
            
            // Ensure logical consistency (start <= end)
            const startDate = startInput.value;
            const endDate = endInput.value;
            
            if (startDate && endDate) {{
                if (startDate > endDate) {{
                    if (inputType === 'start') {{
                        endInput.value = startDate;
                    }} else {{
                        startInput.value = endDate;
                    }}
                }}
            }}
            
            updateDateRangeFilter(filterId, filterName);
        }}
        
        function updateDateRangeFilter(filterId, filterName) {{
            const startInput = document.getElementById(filterId + '_start');
            const endInput = document.getElementById(filterId + '_end');
            const startDate = startInput.value;
            const endDate = endInput.value;
            
            if (startDate || endDate) {{
                window.currentFilters[filterName] = {{
                    start: startDate,
                    end: endDate
                }};
            }} else {{
                delete window.currentFilters[filterName];
            }}
            
            updateDashboardData();
        }}

        function clearFilterSelection(filterId, filterName) {{
            const checkboxes = document.querySelectorAll(`[id^="${{filterId}}_"][type="checkbox"]`);
            checkboxes.forEach(cb => cb.checked = false);
            
            // Trigger the filter update to actually clear the data filter
            updateListFilter(filterId, filterName);
        }}
        
        function filterDropdownOptions(filterId) {{
            const searchInput = document.getElementById(filterId + '_search');
            const options = document.querySelectorAll(`#${{filterId}}_options .filter-item`);
            const searchTerm = searchInput.value.toLowerCase();
            
            options.forEach(option => {{
                const text = option.textContent.toLowerCase();
                option.style.display = text.includes(searchTerm) ? 'block' : 'none';
            }});
        }}
        
        function clearAllFilters() {{
            window.currentFilters = {{}};
            
            // Clear all filter inputs
            document.querySelectorAll('[type="checkbox"]').forEach(cb => cb.checked = false);
            document.querySelectorAll('[type="number"]').forEach(input => input.value = '');
            document.querySelectorAll('[type="date"]').forEach(input => input.value = '');
            document.querySelectorAll('[id$="_display"]').forEach(display => {{
                const filterName = display.id.replace('_display', '').replace('filter_', '').replace(/_/g, ' ');
                display.textContent = `Select ${{filterName}}`;
            }});
            
            updateDashboardData();
        }}
        
        function updateDashboardData() {{
            // Update all KPIs and charts when filters change
            updateAllKPIs();
            updateAllCharts();
            console.log('Current filters:', window.currentFilters);
        }}
        
        // KPI Management Functions
        function registerKPI(kpiId, formula, formatType, unit) {{
            window.registeredKPIs[kpiId] = {{
                formula: formula,
                formatType: formatType,
                unit: unit
            }};
        }}
        
        function updateKPI(kpiId) {{
            const kpi = window.registeredKPIs[kpiId];
            if (!kpi) return;
            
            const valueElement = document.getElementById(kpiId + '_value');
            const changeElement = document.getElementById(kpiId + '_change');
            const containerElement = document.getElementById(kpiId + '_container');
            
            if (!valueElement) return;
            
            // Add updating class for visual feedback
            containerElement.classList.add('kpi-updating');
            
            try {{
                // Evaluate the formula with current filtered data
                const rawValue = eval(kpi.formula);
                const formattedValue = formatKPIValue(rawValue, kpi.formatType);
                
                // Update the display
                valueElement.textContent = formattedValue;
            }} catch (error) {{
                console.error(`Error updating KPI ${{kpiId}}:`, error);
                valueElement.textContent = 'Error';
                changeElement.innerHTML = `<i class="fas fa-exclamation-triangle text-red-500"></i> Calculation error`;
            }}
            
            // Remove updating class
            setTimeout(() => {{
                containerElement.classList.remove('kpi-updating');
            }}, 300);
        }}
        
        function updateAllKPIs() {{
            Object.keys(window.registeredKPIs).forEach(kpiId => {{
                updateKPI(kpiId);
            }});
        }}
        
        function formatKPIValue(value, formatType) {{
            if (value === null || value === undefined || isNaN(value)) {{
                return '--';
            }}
            
            switch (formatType) {{
                case 'number':
                    return new Intl.NumberFormat('en-US').format(Math.round(value));
                case 'currency':
                case 'currency:usd':
                    return new Intl.NumberFormat('en-US', {{
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }}).format(value);
                case 'percentage':
                    return new Intl.NumberFormat('en-US', {{
                        style: 'percent',
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                    }}).format(value / 100);
                case 'decimal':
                    return new Intl.NumberFormat('en-US', {{
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1
                    }}).format(value);
                default:
                    return value.toString();
            }}
        }}
        
        // Chart Management Functions
        function registerChart(chartId, config) {{
            window.registeredCharts[chartId] = {{
                config: config,
                chartInstance: null,
                canvas: document.getElementById(chartId + '_canvas'),
                loadingElement: document.getElementById(chartId + '_loading')
            }};
        }}
        
        function updateChart(chartId) {{
            const chartInfo = window.registeredCharts[chartId];
            if (!chartInfo) return;
            
            const {{ config, canvas, loadingElement }} = chartInfo;
            if (!canvas) return;
            
            // Show loading
            loadingElement.style.display = 'flex';
            
            try {{
                // Get filtered data
                const filteredData = getFilteredData();
                
                // Process data for chart
                const chartData = processChartData(filteredData, config);
                
                // Destroy existing chart
                if (chartInfo.chartInstance) {{
                    chartInfo.chartInstance.destroy();
                }}
                
                // Create new chart
                const ctx = canvas.getContext('2d');
                const chartOptions = getChartOptions(config, chartData.labels);
                chartInfo.chartInstance = new Chart(ctx, {{
                    type: getChartJsType(config.type),
                    data: chartData,
                    options: chartOptions
                }});
                
                // Hide loading
                loadingElement.style.display = 'none';
                
            }} catch (error) {{
                console.error(`Error updating chart ${{chartId}}:`, error);
                loadingElement.innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                        <p class="text-sm text-red-600">Chart error</p>
                    </div>
                `;
            }}
        }}
        
        function updateAllCharts() {{
            Object.keys(window.registeredCharts).forEach(chartId => {{
                updateChart(chartId);
            }});
        }}
        
        function processChartData(data, config) {{
            const {{ x_axis, series_list, default_filter_conditions }} = config;
            
            // Apply default filter conditions if they exist
            let filteredData = data;
            if (default_filter_conditions && Array.isArray(default_filter_conditions)) {{
                filteredData = data.filter(row => {{
                    return default_filter_conditions.every(condition => {{
                        // Handle range conditions like "user_gender2:user_gender=\\"Male\\""
                        const rangeConditionMatch = condition.match(/^([^:]+)2:([^=]+)=(.+)$/);
                        if (rangeConditionMatch) {{
                            const [, , columnName, value] = rangeConditionMatch;
                            const rowValue = row[columnName.trim()];
                            // Remove quotes and unescape escaped quotes
                            const compareValue = value.trim().replace(/\\\\"/g, '"').replace(/^["']|["']$/g, '');
                            return rowValue == compareValue;
                        }}
                        
                        // Parse simple condition like "error_code>0"
                        const conditionMatch = condition.match(/^([^><=!]+)\\s*([><=!]+)\\s*(.+)$/);
                        if (conditionMatch) {{
                            const [, columnName, operator, value] = conditionMatch;
                            const rowValue = row[columnName.trim()];
                            const compareValue = isNaN(value) ? value.trim() : Number(value);
                            
                            switch (operator) {{
                                case '>': return Number(rowValue) > compareValue;
                                case '>=': return Number(rowValue) >= compareValue;
                                case '<': return Number(rowValue) < compareValue;
                                case '<=': return Number(rowValue) <= compareValue;
                                case '=': return rowValue == compareValue;
                                case '!=': return rowValue != compareValue;
                                default: return true;
                            }}
                        }}
                        return true;
                    }});
                }});
            }}
            
            // Group data by x-axis column
            const grouped = {{}};
            filteredData.forEach(row => {{
                const xValue = row[window.columnMapping[x_axis.column] || x_axis.column];
                if (!grouped[xValue]) {{
                    grouped[xValue] = [];
                }}
                grouped[xValue].push(row);
            }});
            
            // Generate labels and datasets
            let labels = Object.keys(grouped).sort();
            const datasets = [];
            
            // Automatically assign axes based on series characteristics
            const shouldUseDualAxes = series_list.length > 1 && (
                // Always use dual axes for combo charts
                config.type === 'combo_chart' ||
                // Different units
                new Set(series_list.map(s => s.unit)).size > 1 ||
                // Different format types (percentage vs number, etc.)
                new Set(series_list.map(s => s.format)).size > 1 ||
                // Different aggregation types (count vs avg/sum/etc)
                (series_list.some(s => s.aggregation === 'count') && 
                 series_list.some(s => s.aggregation !== 'count'))
            );
            
            series_list.forEach((series, index) => {{
                // Automatically assign axis based on chart type
                if (shouldUseDualAxes && index > 0) {{
                    // For horizontal bar charts, secondary axis is x1 (top)
                    // For vertical charts, secondary axis is y1 (right)
                    series.axis = config.type === 'horizontal_bar' ? 'x1' : 'y1';
                }} else {{
                    // Primary axis is x for horizontal, y for vertical
                    series.axis = config.type === 'horizontal_bar' ? 'x' : 'y';
                }}
                
                const columnName = window.columnMapping[series.column] || series.column;
                
                // Handle bubble chart data structure differently
                let seriesData;
                if (config.type === 'bubble') {{
                    seriesData = labels.map((label, labelIndex) => {{
                        let groupData = grouped[label];
                        
                        // Apply filter condition if specified
                        if (series.filter_condition) {{
                            const [filterColumn, filterValue] = series.filter_condition.split('=');
                            const filterColumnName = window.columnMapping[filterColumn] || filterColumn;
                            groupData = groupData.filter(row => row[filterColumnName] === filterValue);
                        }}
                        
                        const values = groupData.map(row => Number(row[columnName]) || 0);
                        let aggregatedValue = 0;
                        
                        switch (series.aggregation) {{
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
                        }}
                        
                        // For bubble charts: x = labelIndex, y = series value, r = bubble size based on data count
                        return {{
                            x: labelIndex,
                            y: aggregatedValue,
                            r: Math.max(5, Math.min(30, values.length * 3 + 5))  // Radius 5-30 based on data count
                        }};
                    }});
                }} else {{
                    seriesData = labels.map(label => {{
                    let groupData = grouped[label];
                    
                    // Apply filter condition if specified
                    if (series.filter_condition) {{
                        const [filterColumn, filterValue] = series.filter_condition.split('=');
                        const filterColumnName = window.columnMapping[filterColumn] || filterColumn;
                        groupData = groupData.filter(row => row[filterColumnName] === filterValue);
                    }}
                    
                    const values = groupData.map(row => Number(row[columnName]) || 0);
                    
                    switch (series.aggregation) {{
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
                    }}
                    }});
                }}
                
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
                if (['pie', 'donut'].includes(config.type)) {{
                    backgroundColor = seriesData.map((_, i) => colors[i % colors.length]);
                    borderColor = seriesData.map((_, i) => colors[i % colors.length].replace('0.8', '1'));
                }} else if (['bar', 'horizontal_bar'].includes(config.type) && config.type !== 'bubble' && seriesData.some(val => val < 0) && seriesData.some(val => val > 0)) {{
                    // For bar charts with negative values, use green for positive and red for negative
                    backgroundColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)'); // Green for positive, red for negative
                    borderColor = seriesData.map(val => val >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)');
                }} else {{
                    backgroundColor = colors[index % colors.length];
                    borderColor = colors[index % colors.length].replace('0.8', '1');
                }}
                
                const axisProperty = config.type === 'horizontal_bar' ? 'xAxisID' : 'yAxisID';
                const dataset = {{
                    label: series.name,
                    data: seriesData,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 2,
                    fill: config.area || false
                }};
                
                // Handle combo charts: first series is bar, others are line
                if (config.type === 'combo_chart') {{
                    if (index === 0) {{
                        dataset.type = 'bar';
                    }} else {{
                        dataset.type = 'line';
                        dataset.fill = false; // Lines should not be filled by default
                    }}
                }}
                
                // Assign axis ID for dual axis support
                if (config.type === 'horizontal_bar') {{
                    dataset.xAxisID = series.axis || 'x';
                }} else if (config.type === 'bubble') {{
                    // For bubble charts, only assign yAxisID (x-axis is always the same)
                    dataset.yAxisID = series.axis || 'y';
                }} else {{
                    dataset.yAxisID = series.axis || 'y';
                }}
                
                datasets.push(dataset);
            }});
            
            // Handle top N filtering for bar and horizontal_bar charts
            if (['bar', 'horizontal_bar'].includes(config.type)) {{
                // Store original count for filter visibility decision
                const originalLabelCount = labels.length;
                
                // Show/hide top N filter based on data count
                const chartId = Object.keys(window.registeredCharts).find(id => 
                    window.registeredCharts[id].config === config);
                if (chartId) {{
                    updateTopNFilterVisibility(chartId, config, originalLabelCount);
                }}
                
                // Apply top N filtering
                if (config.top_n > 0 && labels.length > config.top_n) {{
                    // Sort by the first series data to get top N
                    if (datasets.length > 0) {{
                        const sortedIndices = datasets[0].data
                            .map((value, index) => ({{ value, index }}))
                            .sort((a, b) => b.value - a.value)
                            .slice(0, config.top_n)
                            .map(item => item.index);
                        
                        labels = sortedIndices.map(i => labels[i]);
                        datasets.forEach(dataset => {{
                            dataset.data = sortedIndices.map(i => dataset.data[i]);
                        }});
                    }}
                }}
            }}
            
            // Handle 100% stacked charts by converting data to percentages
            if (config.style === '100% stacked' && datasets.length > 1) {{
                const dataLength = labels.length;
                for (let i = 0; i < dataLength; i++) {{
                    // Calculate total for this data point across all series
                    const total = datasets.reduce((sum, dataset) => {{
                        return sum + (dataset.data[i] || 0);
                    }}, 0);
                    
                    // Convert each dataset value to percentage
                    if (total > 0) {{
                        datasets.forEach(dataset => {{
                            if (dataset.data[i] !== undefined) {{
                                dataset.data[i] = (dataset.data[i] / total) * 100;
                            }}
                        }});
                    }}
                }}
            }}
            
            return {{ labels, datasets }};
        }}
        
        function getChartJsType(xmlType) {{
            const typeMapping = {{
                'bar': 'bar',
                'horizontal_bar': 'bar',
                'line': 'line',
                'pie': 'pie',
                'donut': 'doughnut',
                'bubble': 'bubble',
                'scatter': 'scatter',
                'radar': 'radar',
                'combo_chart': 'bar'
            }};
            return typeMapping[xmlType] || 'bar';
        }}
        
        function getChartOptions(config, labels) {{
            // Provide fallback for labels if not provided
            labels = labels || [];
            
            const options = {{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {{
                    legend: {{
                        position: 'top',
                    }},
                    title: {{
                        display: false
                    }}
                }},
                scales: {{}}
            }};
            
            // Configure scales for bar, line, scatter, bubble, and combo charts
            if (['bar', 'horizontal_bar', 'line', 'scatter', 'bubble', 'combo_chart'].includes(config.type)) {{
                
                // Special handling for bubble charts
                if (config.type === 'bubble') {{
                    // Check if bubble charts need dual axes
                    const bubbleHasDualAxes = config.series_list.length > 1 && (
                        new Set(config.series_list.map(s => s.unit)).size > 1 ||
                        new Set(config.series_list.map(s => s.format)).size > 1
                    );
                    
                    options.scales.x = {{
                        type: 'linear',
                        title: {{
                            display: true,
                            text: config.x_axis.name
                        }},
                        ticks: {{
                            stepSize: 1,
                            callback: function(value, index) {{
                                // Show category labels instead of numeric indices
                                return labels[value] || value;
                            }}
                        }},
                        min: 0,
                        max: labels.length - 1
                    }};
                    
                    // Primary y-axis (left)
                    const primaryBubbleSeries = config.series_list.filter(s => s.axis === 'y' || !s.axis || !bubbleHasDualAxes)[0];
                    options.scales.y = {{
                        type: 'linear',
                        title: {{
                            display: true,
                            text: primaryBubbleSeries ? primaryBubbleSeries.name : 'Value'
                        }},
                        beginAtZero: true
                    }};
                    
                    // Secondary y-axis (right) for bubble charts if needed
                    if (bubbleHasDualAxes) {{
                        const secondaryBubbleSeries = config.series_list.filter(s => s.axis === 'y1')[0];
                        if (secondaryBubbleSeries) {{
                            options.scales.y1 = {{
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {{
                                    display: true,
                                    text: secondaryBubbleSeries.name
                                }},
                                beginAtZero: true,
                                grid: {{
                                    drawOnChartArea: false
                                }}
                            }};
                        }}
                    }}
                    
                    // Custom tooltip for bubble charts
                    options.plugins.tooltip = {{
                        callbacks: {{
                            title: function(tooltipItems) {{
                                const item = tooltipItems[0];
                                const point = item.raw;
                                return labels[point.x] || `Category ${{point.x}}`;
                            }},
                            label: function(context) {{
                                const point = context.raw;
                                return `${{context.dataset.label}}: ${{point.y}} (observations: ${{Math.round((point.r - 5) / 3)}})`;
                            }}
                        }}
                    }};
                    
                }} else {{
                
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
                
                if (config.type === 'horizontal_bar') {{
                    options.indexAxis = 'y';
                    
                    // For horizontal bars: y-axis is categories, x-axis is values
                    options.scales.y = {{
                        title: {{
                            display: true,
                            text: config.x_axis.name
                        }}
                    }};
                    
                    // Primary x-axis (bottom)
                    options.scales.x = {{
                        type: 'linear',
                        display: true,
                        position: 'bottom',
                        title: {{
                            display: true,
                            text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                        }},
                        beginAtZero: true
                    }};
                    
                    // Secondary x-axis (top) if needed
                    if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'x1')) {{
                        const x1SeriesNames = config.series_list
                            .filter(series => series.axis === 'x1')
                            .map(series => series.name);
                        options.scales.x1 = {{
                            type: 'linear',
                            display: true,
                            position: 'top',
                            title: {{
                                display: true,
                                text: x1SeriesNames.join(', ')
                            }},
                            beginAtZero: true,
                            grid: {{
                                drawOnChartArea: false
                            }}
                        }};
                    }}
                }} else {{
                    // For vertical bars and lines: x-axis is categories, y-axis is values
                    options.scales.x = {{
                        title: {{
                            display: true,
                            text: config.x_axis.name
                        }}
                    }};
                    
                    // Primary y-axis (left)
                    options.scales.y = {{
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {{
                            display: true,
                            text: primarySeriesNames.length > 0 ? primarySeriesNames.join(', ') : 'Value'
                        }},
                        beginAtZero: true
                    }};
                    
                    // Secondary y-axis (right) if needed
                    if (hasSecondaryAxis && config.series_list.some(s => s.axis === 'y1')) {{
                        const y1SeriesNames = config.series_list
                            .filter(series => series.axis === 'y1')
                            .map(series => series.name);
                        options.scales.y1 = {{
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {{
                                display: true,
                                text: y1SeriesNames.join(', ')
                            }},
                            beginAtZero: true,
                            grid: {{
                                drawOnChartArea: false
                            }}
                        }};
                    }}
                }}
                
                // For stacked charts, disable dual axes and use single axis (but not for combo charts)
                if (config.style === 'stacked' && config.type !== 'combo_chart') {{
                    options.scales.x.stacked = true;
                    options.scales.y.stacked = true;
                    // Remove secondary axis for stacked charts
                    delete options.scales.y1;
                    delete options.scales.x1;
                }} else if (config.style === '100% stacked' && config.type !== 'combo_chart') {{
                    options.scales.x.stacked = true;
                    options.scales.y.stacked = true;
                    if (config.type === 'horizontal_bar') {{
                        options.scales.x.max = 100;
                        options.scales.x.ticks = {{
                            callback: function(value) {{
                                return value + '%';
                            }}
                        }};
                    }} else {{
                        options.scales.y.max = 100;
                        options.scales.y.ticks = {{
                            callback: function(value) {{
                                return value + '%';
                            }}
                        }};
                    }}
                    options.plugins.tooltip = {{
                        callbacks: {{
                            label: function(context) {{
                                return context.dataset.label + ': ' + context.formattedValue + '%';
                            }}
                        }}
                    }};
                    // Remove secondary axis for 100% stacked charts
                    delete options.scales.y1;
                    delete options.scales.x1;
                }}
                }}
            }}
            
            // Remove scales for pie/donut charts
            if (['pie', 'donut'].includes(config.type)) {{
                delete options.scales;
            }}
            
            return options;
        }}
        
        // Chart Top N Filter Functions
        function updateChartTopN(chartId) {{
            const chartInfo = window.registeredCharts[chartId];
            if (!chartInfo) return;
            
            const selectElement = document.getElementById(chartId + '_top_n');
            const newTopN = parseInt(selectElement.value) || 0;
            
            // Update the chart config
            chartInfo.config.top_n = newTopN;
            
            // Track when user explicitly selects "All" 
            if (newTopN === 0) {{
                chartInfo.config.userSelectedAll = true;
            }} else {{
                chartInfo.config.userSelectedAll = false;
            }}
            
            // Update chart title to include (top x) indicator
            updateChartTitle(chartId, chartInfo.config);
            
            // Redraw the chart with new filter
            updateChart(chartId);
        }}
        
        function updateChartTitle(chartId, config) {{
            const titleElement = document.getElementById(chartId + '_title');
            if (!titleElement) return;
            
            let title = config.original_name;
            if (['bar', 'horizontal_bar'].includes(config.type) && config.top_n > 0) {{
                title += ` (top ${{config.top_n}})`;
            }}
            
            titleElement.textContent = title;
        }}
        
        function updateTopNFilterVisibility(chartId, config, totalLabels) {{
            if (!['bar', 'horizontal_bar'].includes(config.type)) return;
            
            const topNContainer = document.getElementById(chartId + '_top_n_container');
            if (!topNContainer) return;
            
            if (totalLabels > 10) {{
                topNContainer.style.display = 'block';
                // Only auto-set to top 10 if this is the first time and user hasn't explicitly chosen
                if (config.top_n === 0 && !config.userSelectedAll) {{
                    config.top_n = 10;
                    const selectElement = document.getElementById(chartId + '_top_n');
                    if (selectElement) selectElement.value = '10';
                }}
                // If user explicitly selected "All", respect that choice
                else if (config.userSelectedAll) {{
                    config.top_n = 0;
                    const selectElement = document.getElementById(chartId + '_top_n');
                    if (selectElement) selectElement.value = '0';
                }}
            }} else {{
                topNContainer.style.display = 'none';
                config.top_n = 0;
                config.userSelectedAll = false; // Reset flag when filter not needed
                const selectElement = document.getElementById(chartId + '_top_n');
                if (selectElement) selectElement.value = '0';
            }}
            
            // Update the chart title to reflect the current state
            updateChartTitle(chartId, config);
        }}
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', function(event) {{
            if (!event.target.closest('.filter-component')) {{
                document.querySelectorAll('[id$="_dropdown"]').forEach(d => d.classList.add('hidden'));
            }}
        }});
        
        // Data Modal Functions
        let currentPage = 1;
        let rowsPerPage = 25;
        let filteredData = [];
        let allData = [];
        
        function openDataModal() {{
            // Store all data for modal
            allData = [...window.dashboardData];
            filteredData = [...allData];
            
            // Set modal title with filename
            const dataSpan = document.querySelector('span[onclick="openDataModal()"]');
            if (dataSpan) {{
                const filename = dataSpan.textContent.replace('Data: ', '');
                document.getElementById('modalTitle').textContent = filename;
            }}
            
            // Show modal
            document.getElementById('dataModal').classList.remove('hidden');
            
            // Initialize data table
            initializeDataTable();
            
            // Update pagination
            updatePagination();
        }}
        
        function closeDataModal() {{
            document.getElementById('dataModal').classList.add('hidden');
        }}
        
        function initializeDataTable() {{
            if (allData.length === 0) return;
            
            // Get column names
            const columns = Object.keys(allData[0]);
            
            // Update counts
            document.getElementById('dataRowCount').textContent = allData.length;
            document.getElementById('dataColumnCount').textContent = columns.length;
            
            // Create table header
            const headerRow = document.getElementById('dataTableHeader');
            headerRow.innerHTML = columns.map(col => 
                `<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${{col}}</th>`
            ).join('');
            
            // Render current page
            renderCurrentPage();
        }}
        
        function renderCurrentPage() {{
            const startIndex = (currentPage - 1) * rowsPerPage;
            const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);
            const pageData = filteredData.slice(startIndex, endIndex);
            
            const tbody = document.getElementById('dataTableBody');
            tbody.innerHTML = pageData.map(row => {{
                const cells = Object.values(row).map(value => 
                    `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${{formatCellValue(value)}}</td>`
                ).join('');
                return `<tr class="hover:bg-gray-50">${{cells}}</tr>`;
            }}).join('');
            
            // Update pagination info
            document.getElementById('showingStart').textContent = filteredData.length > 0 ? startIndex + 1 : 0;
            document.getElementById('showingEnd').textContent = endIndex;
            document.getElementById('totalRows').textContent = filteredData.length;
        }}
        
        function formatCellValue(value) {{
            if (value === null || value === undefined) return '';
            if (typeof value === 'number') {{
                return new Intl.NumberFormat('en-US').format(value);
            }}
            return String(value);
        }}
        
        function filterDataTable() {{
            const searchTerm = document.getElementById('dataSearch').value.toLowerCase();
            
            if (searchTerm === '') {{
                filteredData = [...allData];
            }} else {{
                filteredData = allData.filter(row => {{
                    return Object.values(row).some(value => 
                        String(value).toLowerCase().includes(searchTerm)
                    );
                }});
            }}
            
            currentPage = 1;
            renderCurrentPage();
            updatePagination();
        }}
        
        function updateRowsPerPage() {{
            rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
            currentPage = 1;
            renderCurrentPage();
            updatePagination();
        }}
        
        function changePage(direction) {{
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            const newPage = currentPage + direction;
            
            if (newPage >= 1 && newPage <= totalPages) {{
                currentPage = newPage;
                renderCurrentPage();
                updatePagination();
            }}
        }}
        
        function updatePagination() {{
            const totalPages = Math.ceil(filteredData.length / rowsPerPage);
            
            // Update page info
            document.getElementById('pageInfo').textContent = `Page ${{currentPage}} of ${{totalPages}}`;
            
            // Update button states
            document.getElementById('prevPage').disabled = currentPage <= 1;
            document.getElementById('nextPage').disabled = currentPage >= totalPages;
        }}
        
        function exportData() {{
            // Create CSV content
            if (filteredData.length === 0) return;
            
            const columns = Object.keys(filteredData[0]);
            const csvContent = [
                columns.join(','),
                ...filteredData.map(row => 
                    columns.map(col => {{
                        const value = row[col];
                        // Escape commas and quotes in CSV
                        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {{
                            return `"${{value.replace(/"/g, '""')}}"`;
                        }}
                        return value;
                    }}).join(',')
                )
            ].join('\\n');
            
            // Create and download file
            const blob = new Blob([csvContent], {{ type: 'text/csv' }});
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'dashboard_data.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }}
        
        // Close modal when clicking outside
        document.addEventListener('click', function(event) {{
            const modal = document.getElementById('dataModal');
            if (event.target === modal) {{
                closeDataModal();
            }}
        }});
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(event) {{
            if (event.key === 'Escape') {{
                closeDataModal();
            }}
        }});
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {{
            console.log('Dashboard initialized with', window.dashboardData.length, 'rows of data');
            updateDashboardData();
            
            // Initialize chart titles
            Object.keys(window.registeredCharts).forEach(chartId => {{
                const chartInfo = window.registeredCharts[chartId];
                if (chartInfo && ['bar', 'horizontal_bar'].includes(chartInfo.config.type)) {{
                    updateChartTitle(chartId, chartInfo.config);
                }}
            }});
        }});
    </script>"""

    def _extract_column_mapping_from_csv_data(
        self, csv_data_json: str
    ) -> Dict[str, str]:
        """Extract column mapping from CSV data"""
        try:
            import json

            data = json.loads(csv_data_json)
            if data and len(data) > 0:
                columns = list(data[0].keys())
                mapping = {}
                for idx, col in enumerate(columns):
                    letter = chr(65 + idx)  # A, B, C, ...
                    mapping[letter] = col
                return mapping
        except:
            pass
        return {}
