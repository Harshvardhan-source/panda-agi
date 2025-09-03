import React, { useState } from "react";
import { Share2, MoreVertical, Trash2, Pencil } from "lucide-react";
import { toast } from "react-hot-toast";
import { useModalState } from "@/hooks/useModalState";
import ShareModal from "./share-modal";
import DeleteConfirmationDialog from "./delete-confirmation-dialog";
import { ArtifactResponse } from "@/lib/api/artifacts";
import { ArtifactData } from "@/types/artifact";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ArtifactActionsProps {
  artifact: ArtifactData | null;
  onArtifactUpdated?: (artifact: ArtifactData) => void;
  onArtifactDeleted?: (artifactId: string) => void;
  onClose?: () => void;
  onEditName?: (() => void) | null;
  showShare?: boolean;
  showDelete?: boolean;
  isSaved?: boolean;
  previewData?: any;
  conversationId?: string;
}

const ArtifactActions: React.FC<ArtifactActionsProps> = ({
  artifact,
  onArtifactUpdated,
  onArtifactDeleted,
  onClose,
  onEditName,
  showShare = true,
  showDelete = true,
  isSaved = false,
  previewData,
  conversationId,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modal state management
  const shareModal = useModalState();
  const deleteModal = useModalState();

  // Handle share
  const handleShare = () => {
    shareModal.open();
  };

  // Handle delete
  const handleDelete = () => {
    deleteModal.open();
  };

  // Handle edit name
  const handleEditName = () => {
    if (onEditName) {
      // Add a small delay to ensure dropdown closes before focusing
      setTimeout(() => {
        onEditName();
      }, 100);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!artifact) {
      toast.error("No artifact to delete");
      return;
    }
    
    deleteModal.setLoading(true);
    try {
      // Import the deleteArtifact function
      const { deleteArtifact } = await import("@/lib/api/artifacts");
      await deleteArtifact(artifact.id);
      
      toast.success('Artifact deleted successfully');
      deleteModal.close();
      
      if (onArtifactDeleted) {
        onArtifactDeleted(artifact.id);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to delete artifact:', error);
      toast.error('Failed to delete artifact');
    } finally {
      deleteModal.setLoading(false);
    }
  };

  // Handle artifact privacy toggle
  const handleTogglePublic = async (artifactToUpdate: ArtifactData) => {
    if (!artifactToUpdate) return;
    
    setIsUpdating(true);
    try {
      // Import the updateArtifact function
      const { updateArtifact } = await import("@/lib/api/artifacts");
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
      
      toast.success(`Creation made ${updatedArtifact.is_public ? 'public' : 'private'} successfully!`);
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      toast.error('Failed to update privacy setting');
    } finally {
      setIsUpdating(false);
    }
  };

  // Create header actions
  const headerActions = (
    <>
      {/* Share button */}
      {showShare && (
        <button
          onClick={handleShare}
          className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
          title="Share"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
      {/* More options dropdown */}
      {showDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-md hover:bg-accent transition-colors flex items-center justify-center cursor-pointer"
              title="More options"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEditName && (
              <DropdownMenuItem
                onClick={handleEditName}
                className="cursor-pointer"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit name
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );

  return (
    <>
      
        {headerActions}
      
      {/* Share Modal */}
      {shareModal.isOpen && (
        <ShareModal
          isOpen={shareModal.isOpen}
          onClose={shareModal.close}
          artifact={artifact as ArtifactResponse}
          onTogglePublic={handleTogglePublic}
          isUpdating={isUpdating}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteModal.isOpen && (
        <DeleteConfirmationDialog
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

export default ArtifactActions; 