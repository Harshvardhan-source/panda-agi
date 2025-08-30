import React, { useState, useEffect } from "react";
import { Download, FileImage, File } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import MarkdownRenderer from "./ui/markdown-renderer";
import SaveArtifactButton from "./save-artifact-button";
import ResizableSidebar from "./ui/resizable-sidebar";
import FileIcon from "./ui/file-icon";
import ExcelViewer from "./excel-viewer";
import Papa from "papaparse";
import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { toast } from "react-hot-toast";
import {
  downloadWithCheck,
  getFileExtension,
  isExcelFile,
  validateContentType,
} from "@/lib/utils";
import ArtifactActions from "./artifact-actions";
import { ArtifactData } from "@/types/artifact";

export interface PreviewData {
  title?: string;
  filename?: string;
  url?: string;
  content?: string;
  type?: string;
}

interface ContentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  previewData?: PreviewData;
  width?: number;
  onResize?: (width: number) => void;
  conversationId?: string;
}

const ContentSidebar: React.FC<ContentSidebarProps> = ({
  isOpen,
  onClose,
  previewData,
  width,
  onResize,
  conversationId,
}) => {
  // Utility function to normalize filenames (remove leading './' or '/' if present)
  const normalizeFilename = (filename: string): string => {
    if (!filename) return "";
    if (filename.startsWith("./")) {
      return filename.substring(2);
    }
    if (filename.startsWith("/")) {
      return filename.substring(1);
    }
    return filename;
  };

  // State for normalized filename and content
  const [normalizedFilename, setNormalizedFilename] = useState("");
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved state management
  const [isSaved, setIsSaved] = useState(false);
  const [savedArtifact, setSavedArtifact] = useState<ArtifactData | null>(null);
  

  // Reset saved state when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setIsSaved(false);
      setSavedArtifact(null);
    }
  }, [isOpen]);

  // Fetch file content when previewData changes
  useEffect(() => {
    if (!previewData) {
      return;
    }

    if (previewData.filename) {
      const normalized = normalizeFilename(previewData.filename);
      setNormalizedFilename(normalized);

      // Only fetch content if it's not an image and we don't already have content
      const fileType = previewData.type || "text";
      if (fileType !== "image" && !previewData.content) {
        fetchFileContent(previewData.filename);
      } else if (previewData.content) {
        // If content was provided directly, use it
        setFileContent(previewData.content);
        setIsLoading(false);
        setError(null);
      }
    } else {
      setNormalizedFilename("");
      setFileContent(null);
      setIsLoading(false);
      setError(null);
    }
  }, [previewData]);

  // Function to fetch file content
  const fetchFileContent = async (filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const fileUrl = getBackendServerURL(
        `/${conversationId}/files/${encodeURIComponent(filename)}?raw=true`
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(
          errorMessage?.detail || `Failed to fetch file: ${response.status}!`
        );
      }

      let content: string | ArrayBuffer;
      // Check if it's an Excel file using reusable function
      if (isExcelFile(filename)) {
        const excelContent = await response.arrayBuffer();
        content = excelContent;
      } else {
        content = await response.text();
      }

      setFileContent(content);
    } catch (err) {
      console.error("Error fetching file content:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!previewData) return null;

  // Get language for syntax highlighting
  const getLanguage = (filename: string): string => {
    if (!filename) return "text";
    const extension = filename.split(".").pop()?.toLowerCase() || "";

    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "jsx",
      ts: "typescript",
      tsx: "tsx",
      py: "python",
      css: "css",
      scss: "scss",
      html: "html",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      txt: "markdown",
      php: "php",
      rb: "ruby",
      go: "go",
      java: "java",
      c: "c",
      cpp: "cpp",
      sh: "bash",
      sql: "sql",
    };

    return languageMap[extension] || "text";
  };

  // Check if content should use full height editor
  const isFullHeightContent = (): boolean => {
    const type = previewData.type || "text";
    return (
      type === "code" ||
      type === "html" ||
      type === "text" ||
      type === "iframe" ||
      type === "table"
    );
  };

  // Common line number styling
  const getLineNumberStyle = (): React.CSSProperties => ({
    minWidth: "3em",
    paddingRight: "1em",
    paddingLeft: "0.5em",
    color: "#9ca3af !important",
    backgroundColor: "#1f2937 !important",
    borderRight: "1px solid #374151",
    userSelect: "none" as const,
    display: "inline-block",
    textAlign: "right",
  });

  // Common syntax highlighter styling
  const getCommonStyle = () => ({
    margin: 0,
    padding: "1rem 1rem 1rem 1.5rem",
    backgroundColor: "#1f2937",
    fontSize: "0.875rem",
    lineHeight: "1.5",
    height: "100%",
  });

  // Custom styles to override syntax highlighter defaults
  const customSyntaxStyles = `
    .syntax-highlighter .linenumber {
      color: #9ca3af !important;
      background-color: #1f2937 !important;
      border-right: 1px solid #374151 !important;
      padding-right: 1em !important;
      margin-right: 1.5em !important;
      display: inline-block !important;
      text-align: right !important;
      user-select: none !important;
      min-width: 3em !important;
    }
  `;

  // CSV Parser function using PapaParse
  const parseCSV = (csvText: string): string[][] => {
    if (!csvText) return [];

    try {
      // Use PapaParse with automatic delimiter detection
      const result = Papa.parse(csvText, {
        delimiter: "", // Auto-detect delimiter
        skipEmptyLines: true,
        transform: (value: string) => value.trim(),
        complete: () => {},
      });

      // Return the parsed data as string[][]
      return result.data as string[][];
    } catch (error) {
      console.error("Error parsing CSV:", error);
      return [];
    }
  };

  // Render content based on type
  const renderContent = () => {
    const type = previewData.type || "text";
    const content = fileContent || previewData.content || "";
    const currentFilename = normalizedFilename || previewData.url || "";

    // Validate content type using reusable function
    const validation = validateContentType(content, currentFilename);
    if (!validation.isValid) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-2xl mb-3">⚠️</div>
            <p className="font-medium text-destructive">
              Content validation failed
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {validation.error}
            </p>
          </div>
        </div>
      );
    }

    switch (type) {
      case "iframe":
        return (
          <div className="h-full rounded-md overflow-hidden border">
            <iframe
              src={previewData.url}
              className="w-full h-full"
              title={previewData.title}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      case "markdown":
        const fileAbsUrl = getBackendServerURL(
          `/${conversationId}/files/${encodeURIComponent(normalizedFilename)}`
        );
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer baseUrl={fileAbsUrl}>
              {content as string}
            </MarkdownRenderer>
          </div>
        );
      case "table":
        // Check if it's an Excel file
        if (isExcelFile(currentFilename)) {
          return (
            <ExcelViewer
              fileName={normalizedFilename}
              content={content as ArrayBuffer}
            />
          );
        }

        // Handle CSV files with the existing logic
        const tableData = parseCSV(content as string);
        const fileExtension = getFileExtension(currentFilename);

        return (
          <div className="h-full flex flex-col">
            {/* Table Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {currentFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{fileExtension.toUpperCase()}</span>
                <span>{tableData.length} rows</span>
                {tableData.length > 0 && (
                  <span>{tableData[0].length} columns</span>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden">
              {tableData.length > 0 ? (
                <div className="w-full h-full overflow-auto">
                  <table
                    className="w-full divide-y divide-gray-200"
                    style={{ minWidth: "max-content" }}
                  >
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        {tableData[0].map((header, index) => (
                          <th
                            key={index}
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                            style={{ minWidth: "150px" }}
                          >
                            <div
                              className="truncate"
                              title={header || `Column ${index + 1}`}
                            >
                              {header || `Column ${index + 1}`}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tableData.slice(1).map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                              style={{ minWidth: "150px", maxWidth: "400px" }}
                              title={cell}
                            >
                              <div className="truncate">{cell}</div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <div className="text-lg mb-2">No data available</div>
                  <div className="text-sm">
                    The file appears to be empty or could not be parsed.
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "html":
        const htmlFilename = normalizedFilename || previewData.url || "";
        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            {/* Editor Header - same style as other code files */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-300 ml-2">
                  {htmlFilename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>HTML</span>
                <span>{(content as string).split("\n").length} lines</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language="html"
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                }}
              >
                {content as string}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      case "image":
        // For images, construct the URL from the filename
        const imageUrl = getBackendServerURL(
          `/${conversationId}/files/${encodeURIComponent(normalizedFilename)}`
        );

        return (
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const nextSibling = target.nextSibling as HTMLElement;
                if (nextSibling) nextSibling.style.display = "block";
              }}
            />
            <div className="hidden text-center text-gray-500 p-4">
              <FileImage className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Image preview not available</p>
              <p className="text-xs text-gray-400 mt-1">
                File: {normalizedFilename}
              </p>
            </div>
          </div>
        );
      case "pdf":
        return (
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-red-500" />
            <p>PDF file detected</p>
            <p className="text-xs text-gray-400 mt-1">
              PDF preview not available in browser
            </p>
            {previewData.url && (
              <a
                href={previewData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Open PDF in new tab
              </a>
            )}
            {content && (
              <div
                className="mt-4 editor-container bg-gray-900 text-gray-100 rounded overflow-hidden flex flex-col"
                style={{ height: "50vh" }}
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                  <span className="text-xs text-gray-300">
                    PDF Content (if readable)
                  </span>
                  <span className="text-xs text-gray-400">
                    {(content as string).split("\n").length} lines
                  </span>
                </div>
                <div className="flex-1 overflow-auto">
                  <SyntaxHighlighter
                    language="text"
                    style={vscDarkPlus}
                    showLineNumbers={true}
                    lineNumberStyle={getLineNumberStyle()}
                    customStyle={getCommonStyle()}
                    className="syntax-highlighter"
                  >
                    {content as string}
                  </SyntaxHighlighter>
                </div>
              </div>
            )}
          </div>
        );
      case "code":
        const filename = normalizedFilename || previewData.url || "";
        const extension = filename.split(".").pop()?.toLowerCase() || "";
        const languageMap: Record<string, string> = {
          js: "JavaScript",
          jsx: "React JSX",
          ts: "TypeScript",
          tsx: "React TSX",
          py: "Python",
          css: "CSS",
          scss: "SCSS",
          json: "JSON",
          xml: "XML",
          yaml: "YAML",
          yml: "YAML",
        };
        const language = languageMap[extension] || extension.toUpperCase();
        const syntaxLanguage = getLanguage(filename);

        return (
          <div className="editor-container bg-gray-900 text-gray-100 rounded overflow-hidden h-full flex flex-col">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-gray-300 ml-2">
                  {filename.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-400">
                <span>{language}</span>
                <span>{(content as string).split("\n").length} lines</span>
              </div>
            </div>

            {/* Code with syntax highlighting */}
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={syntaxLanguage}
                style={vscDarkPlus}
                showLineNumbers={true}
                lineNumberStyle={getLineNumberStyle()}
                customStyle={getCommonStyle()}
                className="syntax-highlighter"
                codeTagProps={{
                  style: {
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  },
                }}
              >
                {content as string}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center text-gray-500 p-4">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Unsupported file format</p>
            <p className="text-xs text-gray-400 mt-1">
              This file type cannot be previewed at the moment
            </p>
          </div>
        );
    }
  };

  // Handle file download
  const handleFileDownload = async () => {
    if (!normalizedFilename || !conversationId) {
      toast.error("Missing file information");
      return;
    }

    try {
      const filename = previewData.filename || normalizedFilename;
      const downloadUrl = getBackendServerURL(
        `/${conversationId}/files/download?file_path=${encodeURIComponent(
          filename
        )}`
      );
      try {
        let fileName = filename.split("/").pop();

        if (fileName && fileName.endsWith(".md")) {
          fileName = fileName.replace(".md", ".pdf");
        }

        await downloadWithCheck(downloadUrl, fileName || "download");
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Download failed: File not found or access denied";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Download error:", error);
      if (error instanceof Error) {
        toast.error(`Download failed: ${error.message}`);
      } else {
        toast.error("Download failed: Unknown error");
      }
    }
  };

  // Handle artifact saved
  const handleArtifactSaved = (artifactData: { artifact: ArtifactData, detail: string }) => {
    setIsSaved(true);
    setSavedArtifact(artifactData.artifact);
  };

  // Handle artifact updated
  const handleArtifactUpdated = (updatedArtifact: ArtifactData) => {
    setSavedArtifact(updatedArtifact);
  };

  // Handle artifact deleted
  const handleArtifactDeleted = (_artifactId: string) => {
    setIsSaved(false);
    setSavedArtifact(null);
    onClose();
  };

  // Create header actions
  const headerActions = (
    <>
      {/* Save button - only show for markdown files when not saved */}
      {(previewData.type === "markdown" || previewData.type === "iframe") && !isSaved && (
        <SaveArtifactButton
          conversationId={conversationId}
          previewData={previewData}
          onSave={handleArtifactSaved}
        />
      )}
      {/* Download button - only show for actual files, not iframes */}
      {(normalizedFilename || previewData.url) &&
        previewData.type !== "iframe" && (
          <button
            onClick={handleFileDownload}
            className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center"
            title={`Download as ${(
              (normalizedFilename || previewData.url || "").split(".").pop() ||
              ""
            )
              .replace("md", "pdf")
              .toUpperCase()}`}
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      {/* Artifact actions - only show when saved */}
      {isSaved && savedArtifact && (
        <ArtifactActions
          artifact={savedArtifact}
          onArtifactUpdated={handleArtifactUpdated}
          onArtifactDeleted={handleArtifactDeleted}
          onClose={onClose}
        />
      )}
    </>
  );

  const subtitleHref =
    previewData.url ||
    (normalizedFilename && conversationId
      ? getBackendServerURL(
          `/${conversationId}/files/${encodeURIComponent(normalizedFilename)}`
        )
      : undefined);

  return (
    <>
      {/* Inject custom styles for syntax highlighter */}
      <style dangerouslySetInnerHTML={{ __html: customSyntaxStyles }} />

      <ResizableSidebar
        isOpen={isOpen}
        onClose={onClose}
        title={previewData.title}
        subtitle={
          normalizedFilename || previewData.url
            ? {
                text: normalizedFilename || previewData.url || "",
                href: subtitleHref,
              }
            : undefined
        }
        icon={
          <FileIcon
            type={previewData.type}
            filepath={normalizedFilename}
            className="w-4 h-4 text-blue-500 mr-2"
          />
        }
        actions={headerActions}
        width={width}
        onResize={onResize}
        loading={isLoading}
        error={error}
        className={isFullHeightContent() ? "[&>div:last-child]:p-0" : ""}
      >
        {isFullHeightContent() ? (
          <div className="h-full p-6">{renderContent()}</div>
        ) : (
          renderContent()
        )}
      </ResizableSidebar>
      

    </>
  );
};

export default ContentSidebar;

// Add this to your global CSS file or inject it here
const globalStyles = `
  body.sidebar-open {
    overflow-x: hidden;
  }
  
  /* Direct targeting for main app container */
  .content-shrink {
    max-width: calc(100% - var(--sidebar-width));
    transition: max-width 0.3s ease;
  }
  
  /* Make sure chat interface and messages shrink */
  .content-shrink .max-w-4xl {
    width: 100%;
    max-width: calc(100% - 2rem) !important;
    transition: max-width 0.3s ease;
  }
  
  /* Ensure message cards shrink properly */
  .content-shrink .max-w-4xl .bg-white/70 {
    width: 100%;
  }
  
  /* Ensure the input area shrinks properly */
  .content-shrink .max-w-4xl textarea,
  .content-shrink .max-w-4xl .flex-1 {
    width: 100%;
  }
`;

// Inject the global styles
if (typeof document !== "undefined") {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = globalStyles;
  document.head.appendChild(styleEl);
}
