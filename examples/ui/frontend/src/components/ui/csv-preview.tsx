import React, { useMemo } from "react";
import { ChevronRight, Database, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CSVPreviewProps {
  filename: string;
  content?: string;
  maxRows?: number;
  maxColumns?: number;
  onExpand?: () => void;
  onRemove?: () => void;
}

const CSVPreview: React.FC<CSVPreviewProps> = ({
  filename,
  content,
  maxRows = 2,
  maxColumns = 8,
  onExpand,
  onRemove,
}) => {

  const csvData = useMemo(() => {
    if (!content) return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };

    try {
      // Simple CSV parsing (handles basic cases)
      const lines = content.trim().split('\n');
      if (lines.length === 0) return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };

      // Parse CSV - simple implementation for basic cases
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"' && !inQuotes) {
            inQuotes = true;
          } else if (char === '"' && inQuotes) {
            const nextChar = line[i + 1];
            if (nextChar === '"') {
              current += '"';
              i++; // Skip the next quote
            } else {
              inQuotes = false;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map(line => parseCSVLine(line)).filter(row => row.some(cell => cell.length > 0));
      
      return {
        headers,
        rows: dataRows,
        totalRows: dataRows.length,
        totalColumns: headers.length,
      };
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return { headers: [], rows: [], totalRows: 0, totalColumns: 0 };
    }
  }, [content]);

  const displayHeaders = csvData.headers.slice(0, maxColumns);
  const displayRows = csvData.rows.slice(0, maxRows);
  const hasMoreColumns = csvData.headers.length > maxColumns;
  const hasMoreRows = csvData.rows.length > maxRows;

  if (!content || csvData.headers.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span className="font-medium truncate">{filename}</span>
            <span className="text-slate-400">•</span>
            <span>CSV file</span>
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-800 truncate">{filename}</span>
            <span className="text-slate-400 text-sm">
              {csvData.totalRows} rows × {csvData.totalColumns} columns
            </span>
          </div>
          <div className="flex items-center space-x-1">
            {hasMoreRows && onExpand && (
              <button
                onClick={onExpand}
                className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800 transition-colors px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-3 h-3" />
                <span>View all</span>
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm">
          {/* Headers */}
          <thead>
            <tr className="border-b border-slate-200/50">
              {displayHeaders.map((header, index) => (
                <th
                  key={index}
                  className="px-3 py-2 text-left font-medium text-slate-700 bg-slate-50/30 border-r border-slate-200/30 last:border-r-0"
                >
                  <div className="truncate max-w-32" title={header}>
                    {header}
                  </div>
                </th>
              ))}
              {hasMoreColumns && (
                <th className="px-3 py-2 text-left font-medium text-slate-400 bg-slate-50/30">
                  <div className="text-xs">
                    +{csvData.headers.length - maxColumns} more
                  </div>
                </th>
              )}
            </tr>
          </thead>

          {/* Data Rows */}
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  "border-b border-slate-200/30 hover:bg-slate-50/50 transition-colors",
                  rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                )}
              >
                {displayHeaders.map((_, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-3 py-2 border-r border-slate-200/30 last:border-r-0"
                  >
                    <div className="truncate max-w-32" title={row[cellIndex] || ''}>
                      {row[cellIndex] || ''}
                    </div>
                  </td>
                ))}
                {hasMoreColumns && (
                  <td className="px-3 py-2 text-slate-400">
                    <div className="text-xs">...</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Gradient fade overlay */}
        {hasMoreRows && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

    </div>
  );
};

export default CSVPreview;