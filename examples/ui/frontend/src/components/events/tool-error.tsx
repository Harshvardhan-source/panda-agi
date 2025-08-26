import React, { JSX, useState } from "react";
import { ChevronRight, AlertTriangle, AlertCircle } from "lucide-react";
import { PLATFORM_MODE } from "@/lib/config";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getLanguage } from "@/lib/utils";

interface ToolErrorEventProps {
  payload?: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    isUpgradeErrorMessage?: boolean;
    timestamp?: string | number;
  };
  openUpgradeModal?: () => void;
}

const ToolErrorEvent: React.FC<ToolErrorEventProps> = ({ payload, openUpgradeModal }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!payload) return null;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const errorMessage = payload.error || "Unknown error occurred";
    
    // Truncate error message for display
    const truncatedError = errorMessage.length > 100 
      ? `${errorMessage.substring(0, 100)}...` 
      : errorMessage;
    
    return `${toolName} failed: ${truncatedError}`;
  };

  const isExecuteScript = payload.tool_name?.toLowerCase().includes("execute script") || 
                         payload.tool_name?.toLowerCase().includes("script");

  const renderExpandedContent = (): JSX.Element => {
    const { tool_name, input_params, error } = payload;

    // Default error display for non-script tools
    return (
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
    );
  };

  const isUpgradeError = payload.isUpgradeErrorMessage;

  // For script errors, display directly without dropdown
  if (isExecuteScript && payload.input_params) {
    const { tool_name, input_params, error } = payload;
    const code = input_params.code as string || input_params.script as string || "Unknown script";
    const language = getLanguage(input_params.language as string);

    return (
      <>
        <div className="flex justify-start">
          <div className="flex items-center space-x-2 px-3 py-2">
            <AlertTriangle className="w-3 h-3 text-red-600" />
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
                <div className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Code:</div>
                  <div 
                    className="max-h-64 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#4B5563 #1F2937'
                    }}
                  >
                    <SyntaxHighlighter
                      language={language}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                      showLineNumbers
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
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

        {/* Upgrade modal trigger for upgrade errors */}
        {isUpgradeError && (
          <div className="mx-3 mb-2">
            {!PLATFORM_MODE ? (
              <button
                onClick={() => window.open('https://agi.pandas-ai.com/upgrade', '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Upgrade Required
              </button>
            ) : (
              openUpgradeModal && (
                <button
                  onClick={openUpgradeModal}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Upgrade Required
                </button>
              )
            )}
          </div>
        )}
      </>
    );
  }

  // For non-script errors, use the dropdown interface
  return (
    <>
      <div className="flex justify-start">
        <div className="flex items-center space-x-2 px-3 py-2">
          {isUpgradeError ? (
            <AlertCircle className="w-3 h-3 text-orange-600" />
          ) : (
            <AlertTriangle className="w-3 h-3 text-red-600" />
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
        <div className="overflow-hidden">{renderExpandedContent()}</div>
      </div>

      {/* Upgrade modal trigger for upgrade errors */}
      {isUpgradeError && (
        <div className="mx-3 mb-2">
          {!PLATFORM_MODE ? (
            <button
              onClick={() => window.open('https://agi.pandas-ai.com/upgrade', '_blank', 'noopener,noreferrer')}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
            >
              <AlertCircle className="w-3 h-3 mr-1" />
              Upgrade Required
            </button>
          ) : (
            openUpgradeModal && (
              <button
                onClick={openUpgradeModal}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Upgrade Required
              </button>
            )
          )}
        </div>
      )}
    </>
  );
};

export default ToolErrorEvent; 