import React, { useState } from "react";
import { FileText } from "lucide-react";
import { 
  ErrorDisplayHeader, 
  ErrorExpandableContent, 
  ErrorMessageDisplay 
} from "./index";

interface FileOperationErrorProps {
  payload: {
    tool_name?: string;
    input_params?: Record<string, unknown>;
    error?: string;
    timestamp?: string | number;
  };
}

const FileOperationError: React.FC<FileOperationErrorProps> = ({ payload }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const { input_params, error } = payload;
  const filePath = input_params?.file_path as string || 
                  input_params?.path as string || 
                  input_params?.filename as string || 
                  "Unknown file";

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
            <FileText className="w-3 h-3 mr-1" />
            File Path:
          </div>
          <div 
            className="bg-gray-800 p-3 rounded-md font-mono text-sm text-green-300 break-all"
            style={{
              wordBreak: 'break-all',
              overflowWrap: 'break-word'
            }}
          >
            {filePath}
          </div>
        </div>
        <ErrorMessageDisplay error={error} />
      </ErrorExpandableContent>
    </>
  );
};

export default FileOperationError; 