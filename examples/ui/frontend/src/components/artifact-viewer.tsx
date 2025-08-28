import React, { useState, useEffect } from "react";
import MarkdownRenderer from "./ui/markdown-renderer";
import ResizableSidebar from "./ui/resizable-sidebar";
import FileIcon from "./ui/file-icon";
import ShareModal from "./share-modal";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";
import { getApiHeaders } from "@/lib/api/common";
import { updateArtifact, deleteArtifact, ArtifactResponse } from "@/lib/api/artifacts";
import { toast } from "react-hot-toast";
import { useFullScreenToggle } from "@/hooks/useFullScreenToggle";
import { useModalState } from "@/hooks/useModalState";
import { ArtifactData, ArtifactViewerCallbacks } from "@/types/artifact";

// Re-export from types for backward compatibility
export type { ArtifactData };

interface ArtifactViewerProps extends ArtifactViewerCallbacks {
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
  onArtifactUpdated,
  onArtifactDeleted,
}) => {

  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Custom hooks for cleaner state management
  const shareModal = useModalState();
  const deleteModal = useModalState();
  const fullScreen = useFullScreenToggle({ 
    initialWidth: width, 
    onResize 
  });

  const fileBaseUrl = `${window.location.origin}/creations/${artifact?.id}/`;

  // Clean up modals on component unmount
  useEffect(() => {
    return () => {
      shareModal.close();
      deleteModal.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch file content when artifact changes
  useEffect(() => {
    if (!artifact) {
      setFileContent(null);
      setIsLoading(false);
      setError(null);
      return;
    }

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

    fetchArtifactContent();
  }, [artifact?.id, artifact?.filepath, fileBaseUrl]);

  // Handle title change
  const handleTitleChange = async (newTitle: string) => {
    if (!artifact) return;
    
    try {
      const updatedArtifact = await updateArtifact(artifact.id, { name: newTitle });
      const newArtifactData: ArtifactData = {
        ...artifact,
        name: updatedArtifact.name,
      };
      
      if (onArtifactUpdated) {
        onArtifactUpdated(newArtifactData);
      }
    } catch (error) {
      console.error('Failed to update artifact title:', error);
      throw error;
    }
  };

  // Handle share
  const handleShare = () => {
    shareModal.open();
  };

  // Handle delete
  const handleDelete = () => {
    deleteModal.open();
  };

  const handleDeleteConfirm = async () => {
    if (!artifact) return;
    
    deleteModal.setLoading(true);
    try {
      await deleteArtifact(artifact.id);
      toast.success('Artifact deleted successfully');
      deleteModal.close();
      
      if (onArtifactDeleted) {
        onArtifactDeleted(artifact.id);
      }
      onClose();
    } catch (error) {
      console.error('Failed to delete artifact:', error);
      toast.error('Failed to delete artifact');
    } finally {
      deleteModal.setLoading(false);
    }
  };

  // Full mode toggle is now handled by the custom hook

  // Handle artifact privacy toggle
  const handleTogglePublic = async (artifactToUpdate: ArtifactData) => {
    if (!artifactToUpdate) return;
    
    setIsUpdating(true);
    try {
      const updatedArtifact = await updateArtifact(artifactToUpdate.id, { 
        is_public: !artifactToUpdate.is_public 
      });
      
      const newArtifactData: ArtifactData = {
        ...artifactToUpdate,
        is_public: updatedArtifact.is_public,
      };
      
      if (onArtifactUpdated) {
        onArtifactUpdated(newArtifactData);
      }
    } catch (error) {
      console.error('Failed to update artifact privacy:', error);
      throw error;
    } finally {
      setIsUpdating(false);
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
    <>
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
        editableTitle={true}
        onTitleChange={handleTitleChange}
        onShare={handleShare}
        onDelete={handleDelete}
        enableFullMode={true}
        isFullMode={fullScreen.isFullMode}
        onToggleFullMode={fullScreen.toggleFullMode}
      >
        {renderContent()}
      </ResizableSidebar>
      
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={shareModal.close}
        artifact={artifact as ArtifactResponse}
        onTogglePublic={handleTogglePublic}
        isUpdating={isUpdating}
      />
      
      {deleteModal.isOpen && (
        <DeleteConfirmationDialog
          key={`delete-${artifact?.id}`}
          isOpen={deleteModal.isOpen}
          onClose={deleteModal.close}
          onConfirm={handleDeleteConfirm}
          title="Delete Artifact"
          description="Are you sure you want to delete this artifact? This action cannot be undone."
          itemName={artifact?.name}
          isLoading={deleteModal.isLoading}
        />
      )}
    </>
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
