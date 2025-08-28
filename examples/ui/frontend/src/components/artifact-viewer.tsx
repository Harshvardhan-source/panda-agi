import React, { useState, useEffect } from "react";
import MarkdownRenderer from "./ui/markdown-renderer";
import ResizableSidebar from "./ui/resizable-sidebar";
import FileIcon from "./ui/file-icon";
import { getApiHeaders } from "@/lib/api/common";

export interface ArtifactData {
  id: string;
  name: string;
  filepath: string;
  conversation_id: string;
  created_at: string;
  is_public: boolean;
  metadata: Record<string, unknown>;
}

interface ArtifactViewerProps {
  isOpen: boolean;
  onClose: () => void;
  artifact?: ArtifactData;
  width?: number;
  onResize?: (width: number) => void;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  isOpen,
  onClose,
  artifact,
  width,
  onResize,
}) => {

  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileBaseUrl = `${window.location.origin}/creations/${artifact?.id}/`;

  // Fetch file content when artifact changes
  useEffect(() => {
    if (!artifact) {
      setFileContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    fetchArtifactContent();
  }, [artifact]);

  // Function to fetch artifact content
  const fetchArtifactContent = async () => {
    if (!artifact) return;

    setIsLoading(true);
    setError(null);

    try {
      const fileUrl = `${fileBaseUrl}${encodeURIComponent(
        artifact.filepath
      )}?raw=true`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiHeaders: any = await getApiHeaders();

      const response = await fetch(fileUrl, { headers: apiHeaders });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(
          errorMessage?.detail ||
            `Failed to fetch artifact: ${response.status}!`
        );
      }

      const content = await response.text();
      setFileContent(content);
    } catch (err) {
      console.error("Error fetching artifact content:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!artifact) return null;

  // Get file extension and determine type
  const getFileExtension = (filepath: string): string => {
    return filepath.split(".").pop()?.toLowerCase() || "";
  };

  const getFileType = (filepath: string): string => {
    const extension = getFileExtension(filepath);

    if (extension === "md" || extension === "markdown") {
      return "markdown";
    } else if (extension === "html" || extension === "htm") {
      return "iframe";
    } else {
      return "markdown"; // Default to markdown for other file types
    }
  };

  // Render content based on type
  const renderContent = () => {
    const type = getFileType(artifact.filepath);
    const content = fileContent || "";

    switch (type) {
      case "markdown":
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer baseUrl={fileBaseUrl}>{content}</MarkdownRenderer>
          </div>
        );
      case "iframe":
        return (
          <div className="h-full rounded-md overflow-hidden border">
            <iframe
              src={`${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`}
              className="w-full h-full"
              title={artifact.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      default:
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <MarkdownRenderer>{content}</MarkdownRenderer>
          </div>
        );
    }
  };

  return (
    <ResizableSidebar
      isOpen={isOpen}
      onClose={onClose}
      title={artifact.name}
      subtitle={{
        text: artifact.filepath,
        href: `${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`,
      }}
      icon={<FileIcon filepath={artifact.filepath} className="w-4 h-4 text-blue-500 mr-2" />}
      width={width}
      onResize={onResize}
      loading={isLoading}
      error={error}
    >
      {renderContent()}
    </ResizableSidebar>
  );
};

export default ArtifactViewer;

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
