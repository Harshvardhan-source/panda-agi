import React from "react";
import { FileText, Eye } from "lucide-react";

interface FileReplaceEventProps {
  payload?: {
    file?: string;
    path?: string;
    content?: string;
  };
  onPreviewClick?: (previewData: unknown) => void;
}

const FileReplaceEvent: React.FC<FileReplaceEventProps> = ({
  payload,
  onPreviewClick,
}) => {
  if (!payload) return null;

  const filename = payload.file || payload.path;

  const truncateFilename = (
    filename: string | undefined,
    maxLength = 50
  ): string => {
    if (!filename) return "Unknown file";
    return filename.length > maxLength
      ? `${filename.substring(0, maxLength)}...`
      : filename;
  };

  const handlePreviewClick = () => {
    if (onPreviewClick && filename) {
      const getFileType = (filePath: string): string => {
        if (!filePath) return "text";
        const extension = filePath.split(".").pop()?.toLowerCase();
        if (extension && ["csv", "xls", "xlsx"].includes(extension))
          return "table";
        if (extension && ["md", "markdown", "txt"].includes(extension))
          return "markdown";
        if (extension && ["html", "htm"].includes(extension)) return "html";
        if (
          extension &&
          [
            "js",
            "jsx",
            "ts",
            "tsx",
            "py",
            "java",
            "c",
            "cpp",
            "go",
            "rb",
            "php",
            "css",
            "scss",
            "json",
            "xml",
            "yaml",
            "yml",
          ].includes(extension)
        )
          return "code";
        if (
          extension &&
          ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(
            extension
          )
        )
          return "image";
        if (extension === "pdf") return "pdf";
        return "text";
      };

      onPreviewClick({
        filename: filename,
        title: filename.split("/").pop(),
        type: getFileType(filename),
      });
    }
  };

  return (
    <div className="flex justify-start mb-2">
      <div className="flex items-center space-x-2 px-3 py-2 bg-white/90 rounded-xl">
        <FileText className="w-3 h-3 text-yellow-600" />
        <span className="text-xs text-slate-600 font-medium">
          Edited{" "}
          <button
            onClick={handlePreviewClick}
            className="text-slate-800 hover:text-slate-900 hover:underline cursor-pointer bg-transparent border-none p-0 font-inherit font-semibold"
            title="Click to open file"
          >
            {truncateFilename(filename?.split("/").pop() || filename)}
          </button>
        </span>
        {payload.content && (
          <button
            onClick={handlePreviewClick}
            className="flex items-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="View in preview"
          >
            <Eye className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FileReplaceEvent;
