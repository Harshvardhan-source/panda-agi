import React, { useState } from "react";
import { Terminal } from "lucide-react";
import { 
  ErrorDisplayHeader, 
  ErrorExpandableContent, 
  ErrorMessageDisplay 
} from "./index";

interface ShellOperationErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const ShellOperationError: React.FC<ShellOperationErrorProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const { input_params, error } = payload;
  const command = input_params?.command as string || 
                  input_params?.cmd as string || 
                  input_params?.script as string || 
                  "Unknown command";

  return (
    <>
      <ErrorDisplayHeader 
        payload={payload}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
      />

      <ErrorExpandableContent isExpanded={isExpanded}>
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1 flex items-center">
            <Terminal className="w-3 h-3 mr-1" />
            Command:
          </div>
          <div 
            className="bg-gray-800 p-3 rounded-md font-mono text-sm text-yellow-300 break-all"
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {command}
          </div>
        </div>
        <ErrorMessageDisplay error={error} />
      </ErrorExpandableContent>
    </>
  );
};

export default ShellOperationError; 