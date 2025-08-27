import React, { useState } from "react";
import { ChevronRight, BadgeAlert, AlertCircle } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface DefaultErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    isUpgradeErrorMessage?: boolean;
    timestamp?: string | number;
  };
}

const DefaultError: React.FC<DefaultErrorProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const errorMessage = payload.error || "Unknown error occurred";
    
    // Truncate error message for display
    const truncatedError = errorMessage.length > 120 
      ? `${errorMessage.substring(0, 120)}...` 
      : errorMessage;
    
    return `${toolName} failed: ${truncatedError}`;
  };

  const { input_params, error, isUpgradeErrorMessage } = payload;

  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {isUpgradeErrorMessage ? (
            <AlertCircle className="w-3 h-3 text-orange-600" />
          ) : (
            <BadgeAlert className="w-3 h-3 text-red-600" />
          )}
          <span className="text-xs text-gray-500 truncate max-w-md">
            <strong>{getDisplayContent()}</strong>
          </span>
          <button
            onClick={toggleExpanded}
            className="flex items-center py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Hide details" : "Show details"}
          >
            <div
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
            >
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="mx-3 mb-4 bg-gray-900 text-white rounded-md overflow-hidden border-red-200">
            <div className="p-3">
              {input_params && Object.keys(input_params).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Input Parameters:</div>
                  <div 
                    className="max-h-64 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4B5563 #1F2937'
                    }}
                  >
                    <SyntaxHighlighter
                      language="json"
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                      showLineNumbers
                    >
                      {JSON.stringify(input_params, null, 2)}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )}
              {error && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Error:</div>
                  <div 
                    className="bg-gray-800 p-3 rounded-md font-mono text-sm text-gray-300 whitespace-pre-wrap break-words max-h-64 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4B5563 #1F2937'
                    }}
                  >
                    {String(error)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DefaultError; 