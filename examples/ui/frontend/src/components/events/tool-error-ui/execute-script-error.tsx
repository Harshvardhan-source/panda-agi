import React, { JSX, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getLanguage } from "@/lib/utils";
import { 
  ErrorDisplayHeader, 
  ErrorExpandableContent, 
  ErrorMessageDisplay 
} from "./index";

interface ExecuteScriptErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const ExecuteScriptError: React.FC<ExecuteScriptErrorProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const { input_params, error } = payload;
  const code = input_params?.code as string || input_params?.script as string || "Unknown script";
  const language = getLanguage(input_params?.language as string);

  return (
    <>
      <ErrorDisplayHeader 
        payload={payload}
        isExpanded={isExpanded}
        onToggleExpanded={toggleExpanded}
      />

      <ErrorExpandableContent isExpanded={isExpanded}>
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
        <ErrorMessageDisplay error={error} />
      </ErrorExpandableContent>
    </>
  );
};

export default ExecuteScriptError; 