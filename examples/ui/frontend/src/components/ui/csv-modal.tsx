import React, { useMemo } from "react";
import { X, Database, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface CSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  content: string;
}

const CSVModal: React.FC<CSVModalProps> = ({
  isOpen,
  onClose,
  filename,
  content,
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

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-slate-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 truncate">{filename}</h2>
              <p className="text-sm text-slate-500">
                {csvData.totalRows} rows × {csvData.totalColumns} columns
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            {/* Headers */}
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-200">
                {csvData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left font-medium text-slate-700 bg-slate-50 border-r border-slate-200 last:border-r-0"
                  >
                    <div className="truncate" title={header}>
                      {header}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {csvData.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "border-b border-slate-100 hover:bg-slate-50/70 transition-colors",
                    rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  )}
                >
                  {csvData.headers.map((_, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 border-r border-slate-200/50 last:border-r-0"
                    >
                      <div className="truncate max-w-xs" title={row[cellIndex] || ''}>
                        {row[cellIndex] || ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CSVModal;