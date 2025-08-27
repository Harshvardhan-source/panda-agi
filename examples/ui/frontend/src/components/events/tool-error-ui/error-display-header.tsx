import React from "react";
import { ChevronRight, BadgeAlert, AlertCircle } from "lucide-react";

interface ErrorDisplayHeaderProps {
  payload: {
    tool_name?: string;
    error?: string;
    isUpgradeErrorMessage?: boolean;
  };
  isExpanded: boolean;
  onToggleExpanded: () => void;
  showExpandButton?: boolean;
}

const ErrorDisplayHeader: React.FC<ErrorDisplayHeaderProps> = ({ 
  payload, 
  isExpanded, 
  onToggleExpanded,
  showExpandButton = true 
}) => {
  const getDisplayContent = () => {
    const toolName = payload.tool_name || "Unknown tool";
    const errorMessage = payload.error || "Unknown error occurred";
    
    // Truncate error message for display
    const truncatedError = errorMessage.length > 120 
      ? `${errorMessage.substring(0, 120)}...` 
      : errorMessage;
    
    return { toolName, truncatedError };
  };

  const { isUpgradeErrorMessage } = payload;
  const { toolName, truncatedError } = getDisplayContent();

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-red-50/90 rounded-xl border border-red-200/50">
        {isUpgradeErrorMessage ? (
          <AlertCircle className="w-3 h-3 text-orange-600" />
        ) : (
          <BadgeAlert className="w-3 h-3 text-red-600" />
        )}
        <span className="text-xs text-red-700 font-medium truncate max-w-md">
          {toolName} failed: <strong>{truncatedError}</strong>
        </span>
        {showExpandButton && (
          <button
            onClick={onToggleExpanded}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
        )}
      </div>
    </div>
  );
};

export default ErrorDisplayHeader; 