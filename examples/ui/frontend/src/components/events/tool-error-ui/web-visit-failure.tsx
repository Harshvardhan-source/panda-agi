import React, { useState } from "react";
import { 
  ErrorDisplayHeader, 
  ErrorExpandableContent, 
  ErrorMessageDisplay 
} from "./index";

interface WebVisitFailureProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const WebVisitFailure: React.FC<WebVisitFailureProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const { input_params, error } = payload;
  const url = input_params?.url as string || "Unknown URL";

  return (
    <>
      <ErrorDisplayHeader 
        payload={payload}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
      />

      <ErrorExpandableContent isExpanded={isExpanded}>
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">URL:</div>
          <div 
            className="bg-gray-800 p-3 rounded-md font-mono text-sm text-blue-300 break-all"
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {url}
          </div>
        </div>
        <ErrorMessageDisplay error={error} />
      </ErrorExpandableContent>
    </>
  );
};

export default WebVisitFailure; 