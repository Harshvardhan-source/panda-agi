import React from "react";
import { Upload, Eye } from "lucide-react";
import { getFileType } from "@/lib/utils";

interface FileUploadEventProps {
  payload?: {
    filename?: string;
    original_filename?: string;
    size?: number;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
}

const FileUploadEvent: React.FC<FileUploadEventProps> = ({ payload, onPreviewClick }) => {
  if (!payload) return null;

  const filename = payload.filename || payload.original_filename;
  const fileSize = payload.size;

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      const fileType = getFileType(filename);
      
      onPreviewClick({
        filename: filename,
        title: `uploaded: ${filename}`,
        type: fileType,
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <Upload className="w-3 h-3 text-green-600" />
        <span className="text-xs text-slate-600 font-medium">
          Uploaded{" "}
          <button
            onClick={handlePreviewClick}
            className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
            title="Click to open file"
          >
            {filename}
          </button>
          {fileSize && (
            <span className="text-gray-400 ml-1">
              ({formatFileSize(fileSize)})
            </span>
          )}
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center ml-2 px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            title="View content"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileUploadEvent;
