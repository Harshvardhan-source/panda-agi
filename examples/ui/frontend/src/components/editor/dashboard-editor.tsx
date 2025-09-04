import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Settings, BarChart3, LineChart, PieChart } from "lucide-react";

interface ChartConfig {
  id: string;
  type: string;
  name: string;
  x_axis: {
    name: string;
    column: string;
    group_by: string;
  };
  series_list: Array<{
    name: string;
    column: string;
    aggregation: string;
    format: string;
  }>;
}

interface DashboardEditorProps {
  content: string;
  artifact?: {
    id: string;
    filepath: string;
    [key: string]: any;
  } | null;
  onChange: (content: string) => void;
  availableColumns?: Array<{ letter: string; name: string }>;
}

const CHART_TYPES = [
  { value: "bar", label: "Bar Chart", icon: BarChart3 },
  { value: "line", label: "Line Chart", icon: LineChart },
  { value: "pie", label: "Pie Chart", icon: PieChart },
  { value: "donut", label: "Donut Chart", icon: PieChart },
  { value: "horizontal_bar", label: "Horizontal Bar", icon: BarChart3 },
];

const AGGREGATION_TYPES = [
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "count", label: "Count" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
];

const FORMAT_TYPES = [
  { value: "currency:usd", label: "Currency (USD)" },
  { value: "number", label: "Number" },
  { value: "percentage", label: "Percentage" },
  { value: "text", label: "Text" },
];

const DashboardEditor: React.FC<DashboardEditorProps> = ({
  content,
  artifact,
  onChange,
  availableColumns = []
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editedChart, setEditedChart] = useState<ChartConfig | null>(null);
  const [dynamicColumns, setDynamicColumns] = useState<Array<{ letter: string; name: string }>>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // State for compiled dashboard content (moved up for proper initialization order)
  const [compiledContent, setCompiledContent] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationError, setCompilationError] = useState<string | null>(null);
  const [rawPXMLContent, setRawPXMLContent] = useState<string | null>(null);
  const [isFetchingRaw, setIsFetchingRaw] = useState(false);

  // Parse PXML content to extract chart configurations
  const parseChartsFromPXML = (pxmlContent: string): ChartConfig[] => {
    
    // Check if content is HTML instead of PXML
    if (pxmlContent.trim().startsWith('<!DOCTYPE html>') || pxmlContent.trim().startsWith('<html')) {
      return [];
    }
    
    const charts: ChartConfig[] = [];
    const parser = new DOMParser();
    
    try {
      const doc = parser.parseFromString(pxmlContent, "text/xml");
      
      // Check for parsing errors
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        return charts;
      }
      
      const chartElements = doc.querySelectorAll("chart");
      
      chartElements.forEach((chartEl, index) => {
        
        // Generate ID from the chart name, similar to how the backend does it
        const name = chartEl.querySelector("name")?.textContent || `Chart ${index + 1}`;
        const id = chartEl.getAttribute("id") || `chart_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        
        
        const chart: ChartConfig = {
          id: id,
          type: chartEl.getAttribute("type") || "bar",
          name: name,
          x_axis: {
            name: chartEl.querySelector("x_axis name")?.textContent || "",
            column: chartEl.querySelector("x_axis column")?.textContent || "",
            group_by: chartEl.querySelector("x_axis group_by")?.textContent || "",
          },
          series_list: []
        };

        const seriesElements = chartEl.querySelectorAll("series");
        seriesElements.forEach(seriesEl => {
          chart.series_list.push({
            name: seriesEl.querySelector("name")?.textContent || "",
            column: seriesEl.querySelector("column")?.textContent || "",
            aggregation: seriesEl.querySelector("aggregation")?.textContent || "sum",
            format: seriesEl.querySelector("format")?.textContent || "number",
          });
        });

        charts.push(chart);
      });
      
    } catch (error) {
    }

    return charts;
  };

  // Update PXML content with edited chart
  const updatePXMLWithChart = (originalContent: string, chartConfig: ChartConfig): string => {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    
    try {
      const doc = parser.parseFromString(originalContent, "text/xml");
      const chartElements = doc.querySelectorAll("chart");
      
      // Find the chart to update (by index for now)
      const chartIndex = parseInt(chartConfig.id.replace("chart_", ""));
      const chartEl = chartElements[chartIndex];
      
      if (chartEl) {
        // Update chart type
        chartEl.setAttribute("type", chartConfig.type);
        
        // Update chart name
        const nameEl = chartEl.querySelector("name");
        if (nameEl) nameEl.textContent = chartConfig.name;
        
        // Update x_axis
        const xAxisNameEl = chartEl.querySelector("x_axis name");
        const xAxisColumnEl = chartEl.querySelector("x_axis column");
        const xAxisGroupByEl = chartEl.querySelector("x_axis group_by");
        
        if (xAxisNameEl) xAxisNameEl.textContent = chartConfig.x_axis.name;
        if (xAxisColumnEl) xAxisColumnEl.textContent = chartConfig.x_axis.column;
        if (xAxisGroupByEl) xAxisGroupByEl.textContent = chartConfig.x_axis.group_by;
        
        // Update series
        const seriesElements = chartEl.querySelectorAll("series");
        chartConfig.series_list.forEach((series, index) => {
          const seriesEl = seriesElements[index];
          if (seriesEl) {
            const seriesNameEl = seriesEl.querySelector("name");
            const seriesColumnEl = seriesEl.querySelector("column");
            const seriesAggregationEl = seriesEl.querySelector("aggregation");
            const seriesFormatEl = seriesEl.querySelector("format");
            
            if (seriesNameEl) seriesNameEl.textContent = series.name;
            if (seriesColumnEl) seriesColumnEl.textContent = series.column;
            if (seriesAggregationEl) seriesAggregationEl.textContent = series.aggregation;
            if (seriesFormatEl) seriesFormatEl.textContent = series.format;
          }
        });
      }
      
      return serializer.serializeToString(doc);
    } catch (error) {
      console.error("Error updating PXML:", error);
      return originalContent;
    }
  };

  // Extract columns dynamically from iframe
  const extractColumnsFromIframe = (): Array<{ letter: string; name: string }> => {
    try {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return [];

      const iframeWindow = iframe.contentWindow as Window & { columnMapping?: Record<string, string> };
      const columnMapping = iframeWindow.columnMapping;
      
      if (columnMapping) {
        return Object.entries(columnMapping).map(([letter, name]) => ({
          letter,
          name: name as string
        }));
      }
    } catch {
    }
    return [];
  };


  // Get columns for dropdowns
  const getAvailableColumns = () => {
    return dynamicColumns.length > 0 ? dynamicColumns : availableColumns;
  };

  // Handle chart click from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "chart-edit" && event.data.chartId) {
        // Use raw PXML content for parsing if available, otherwise fall back to current content
        const contentToParse = rawPXMLContent || content;
        
        const charts = parseChartsFromPXML(contentToParse);
        
        // Find chart by matching the ID (not by index)
        const chart = charts.find(c => c.id === event.data.chartId);
        
        if (chart) {
          setEditedChart({ ...chart });
          setIsEditorOpen(true);
        } else {
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [content, rawPXMLContent]);

  // Extract columns and inject click handlers into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        // Wait a bit for dashboard to fully initialize
        setTimeout(() => {
          // Extract columns from iframe
          const columns = extractColumnsFromIframe();
          if (columns.length > 0) {
            setDynamicColumns(columns);
          }

          // Set up click handlers
          const iframeDoc = iframe.contentDocument;
          if (!iframeDoc) return;

          // First, try to inject a script to add click handlers from within the iframe
          const script = iframeDoc.createElement("script");
          script.textContent = `
            // Add click handlers to chart containers and edit buttons
            function setupChartEditors() {
              
              // Handle chart container clicks
              const chartContainers = document.querySelectorAll('[id*="chart_"][id$="_container"]');
              chartContainers.forEach((container) => {
                const chartId = container.id.replace("_container", "");
                container.style.cursor = "pointer";
                container.addEventListener("click", (e) => {
                  e.stopPropagation();
                  parent.postMessage({ type: "chart-edit", chartId }, "*");
                });

                // Add hover effect
                container.addEventListener("mouseenter", () => {
                  container.style.boxShadow = "0 0 0 2px rgba(59, 130, 246, 0.3)";
                });
                container.addEventListener("mouseleave", () => {
                  container.style.boxShadow = "";
                });
              });

              // Handle existing edit buttons
              const editButtons = document.querySelectorAll('[onclick*="editChart"]');
              editButtons.forEach((button) => {
                const onclickAttr = button.getAttribute("onclick");
                if (onclickAttr) {
                  const match = onclickAttr.match(/editChart\\(['"]([^'"]+)['"]/);
                  if (match) {
                    const chartId = match[1];
                    button.addEventListener("click", (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      parent.postMessage({ type: "chart-edit", chartId }, "*");
                    });
                  }
                }
              });
              
            }

            // Run setup when DOM is ready
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", setupChartEditors);
            } else {
              setupChartEditors();
            }
          `;
          iframeDoc.head.appendChild(script);
        }, 500);
      } catch (error) {
        console.error("Error setting up chart editors:", error);
      }
    };

    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [content]);

  const handleSaveChart = () => {
    if (!editedChart) return;
    
    // Use raw PXML content for updating if available
    const contentToUpdate = rawPXMLContent || content;
    
    const updatedContent = updatePXMLWithChart(contentToUpdate, editedChart);
    onChange(updatedContent);
    
    // Update the stored raw PXML content
    if (rawPXMLContent) {
      setRawPXMLContent(updatedContent);
    }
    
    setIsEditorOpen(false);
    setEditedChart(null);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditedChart(null);
  };


  // Compile PXML to HTML when content changes
  useEffect(() => {
    const hasArtifact = !!artifact;
    
    
    if (content.trim().startsWith('<dashboard>') && hasArtifact) {
      // We have raw PXML - store it and get the compiled version for display
      setRawPXMLContent(content);
      fetchCompiledVersion();
    } else if (content.trim().startsWith('<!DOCTYPE html>') && hasArtifact) {
      // We have compiled HTML - use it directly but also fetch raw PXML for editing
      setCompiledContent(content);
      fetchRawPXMLForEditing();
    } else {
      setCompiledContent(content);
      setRawPXMLContent(null); // Clear raw PXML for non-PXML content
    }
  }, [content, artifact]);

  // Fetch compiled HTML version when we have raw PXML
  const fetchCompiledVersion = async () => {
    setIsCompiling(true);
    setCompilationError(null);
    
    try {
      if (!artifact) {
        throw new Error('No artifact available for compilation');
      }
      
      const artifactId = artifact.id;
      const filename = artifact.filepath;
      
      // Get compiled version (without ?raw=true)
      const compiledUrl = `/creations/${artifactId}/${filename}`;
      
      const response = await fetch(compiledUrl, {
        headers: { 'Accept': 'text/html' }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch compiled version: ${response.status} ${response.statusText}`);
      }
      
      const compiledHtml = await response.text();
      
      setCompiledContent(compiledHtml);
    } catch (error) {
      console.error('❌ Error fetching compiled version:', error);
      setCompilationError(error instanceof Error ? error.message : 'Compilation failed');
      setCompiledContent(content); // Fallback to raw content
    } finally {
      setIsCompiling(false);
    }
  };

  // Fetch raw PXML for editing when we have compiled HTML
  const fetchRawPXMLForEditing = async () => {
    setIsFetchingRaw(true);
    
    try {
      if (!artifact) {
        return;
      }
      
      const artifactId = artifact.id;
      const filename = artifact.filepath;
      
      // Get raw version (with ?raw=true)
      const rawUrl = `/creations/${artifactId}/${filename}?raw=true`;
      
      // Use same headers as artifact viewer
      const { getApiHeaders } = await import('../../lib/api/common');
      const apiHeaders = await getApiHeaders();
      
      const response = await fetch(rawUrl, { 
        headers: {
          ...apiHeaders,
          'Accept': 'application/xml,text/xml,text/plain'
        }
      });
      
      
      if (!response.ok) {
        return;
      }
      
      const rawPXML = await response.text();
      
      // Verify it's actually PXML before storing
      if (!rawPXML.trim().startsWith('<dashboard>')) {
        return;
      }
      
      // Store the raw PXML for chart editing
      setRawPXMLContent(rawPXML);
      
      // Parse charts from the raw PXML for editing
      const charts = parseChartsFromPXML(rawPXML);
      
    } catch (error) {
    } finally {
      setIsFetchingRaw(false);
    }
  };

  // Get content to display in iframe
  const getDisplayContent = () => {
    if (isCompiling) {
      return `
        <html>
          <body style="font-family: system-ui; padding: 20px; text-align: center;">
            <h2>📊 Compiling Dashboard...</h2>
            <p>Please wait while we prepare your dashboard for editing.</p>
          </body>
        </html>
      `;
    }
    
    if (compilationError) {
      return `
        <html>
          <body style="font-family: system-ui; padding: 20px; color: #dc2626;">
            <h2>❌ Compilation Error</h2>
            <p>${compilationError}</p>
          </body>
        </html>
      `;
    }
    
    return compiledContent || content;
  };

  return (
    <div className="relative h-full flex">
      {/* Main Dashboard View */}
      <div className={`transition-all duration-300 ${isEditorOpen ? "mr-96" : ""} flex-1`}>
        <iframe
          ref={iframeRef}
          srcDoc={getDisplayContent()}
          className="w-full h-full border-0"
          title="Dashboard Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>

      {/* Editor Sidebar */}
      {isEditorOpen && editedChart && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Edit Chart</h3>
              </div>
              <button
                onClick={handleCloseEditor}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chart Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Title
              </label>
              <input
                type="text"
                value={editedChart.name}
                onChange={(e) => setEditedChart({ ...editedChart, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter chart title"
              />
            </div>

            {/* Chart Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CHART_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setEditedChart({ ...editedChart, type: type.value })}
                      className={`p-3 border rounded-lg transition-colors flex flex-col items-center space-y-1 ${
                        editedChart.type === type.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* X-Axis Configuration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                X-Axis
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Axis Name</label>
                  <input
                    type="text"
                    value={editedChart.x_axis.name}
                    onChange={(e) => setEditedChart({
                      ...editedChart,
                      x_axis: { ...editedChart.x_axis, name: e.target.value }
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter axis name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Column</label>
                  <select
                    value={editedChart.x_axis.column}
                    onChange={(e) => setEditedChart({
                      ...editedChart,
                      x_axis: { 
                        ...editedChart.x_axis, 
                        column: e.target.value,
                        group_by: e.target.value // Keep group_by in sync
                      }
                    })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select column</option>
                    {getAvailableColumns().map((col) => (
                      <option key={col.letter} value={col.letter}>
                        {col.name} ({col.letter})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Series Configuration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Series
              </label>
              {editedChart.series_list.map((series, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Series Name</label>
                      <input
                        type="text"
                        value={series.name}
                        onChange={(e) => {
                          const updatedSeries = [...editedChart.series_list];
                          updatedSeries[index] = { ...series, name: e.target.value };
                          setEditedChart({ ...editedChart, series_list: updatedSeries });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter series name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Column</label>
                      <select
                        value={series.column}
                        onChange={(e) => {
                          const updatedSeries = [...editedChart.series_list];
                          updatedSeries[index] = { ...series, column: e.target.value };
                          setEditedChart({ ...editedChart, series_list: updatedSeries });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select column</option>
                        {getAvailableColumns().map((col) => (
                          <option key={col.letter} value={col.letter}>
                            {col.name} ({col.letter})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Aggregation</label>
                        <select
                          value={series.aggregation}
                          onChange={(e) => {
                            const updatedSeries = [...editedChart.series_list];
                            updatedSeries[index] = { ...series, aggregation: e.target.value };
                            setEditedChart({ ...editedChart, series_list: updatedSeries });
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {AGGREGATION_TYPES.map((agg) => (
                            <option key={agg.value} value={agg.value}>
                              {agg.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Format</label>
                        <select
                          value={series.format}
                          onChange={(e) => {
                            const updatedSeries = [...editedChart.series_list];
                            updatedSeries[index] = { ...series, format: e.target.value };
                            setEditedChart({ ...editedChart, series_list: updatedSeries });
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FORMAT_TYPES.map((format) => (
                            <option key={format.value} value={format.value}>
                              {format.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <Button onClick={handleSaveChart} className="flex-1">
                Save Changes
              </Button>
              <Button onClick={handleCloseEditor} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardEditor;
