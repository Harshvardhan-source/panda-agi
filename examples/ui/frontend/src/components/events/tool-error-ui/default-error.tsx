import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { 
  ErrorDisplayHeader, 
  ErrorExpandableContent, 
  ErrorMessageDisplay 
} from "./index";

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

  const { input_params, error } = payload;

  return (
    <>
      <ErrorDisplayHeader 
        payload={payload}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
      />

      <ErrorExpandableContent isExpanded={isExpanded}>
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
        <ErrorMessageDisplay error={error} />
      </ErrorExpandableContent>
    </>
  );
};

export default DefaultError; 