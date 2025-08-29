import React, { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveArtifact, suggestArtifactName } from "@/lib/api/artifacts";
import { toast } from "react-hot-toast";

interface SaveArtifactButtonProps {
  conversationId?: string;
  previewData?: {
    title?: string;
    filename?: string;
    url?: string;
    content?: string;
    type?: string;
  };
}

const SaveArtifactButton: React.FC<SaveArtifactButtonProps> = ({
  conversationId,
  previewData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [artifactName, setArtifactName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingName, setIsSuggestingName] = useState(false);

  const handleSaveArtifact = async () => {
    if (!conversationId) {
      toast.error("Missing conversation ID");
      return;
    }

    if (!artifactName.trim()) {
      toast.error("Please enter an creation name");
      return;
    }

    setIsLoading(true);
    try {
      await saveArtifact(conversationId, {
        type: previewData?.type || "text",
        name: artifactName.trim(),
        filepath: previewData?.url || previewData?.filename || ""
      });
      toast.success("Creation saved successfully!");
      setIsOpen(false);
      setArtifactName("");
    } catch (error) {
      console.error("Save error:", error);
      if (error instanceof Error) {
        toast.error(`Save failed: ${error.message}`);
      } else {
        toast.error("Save failed: Unknown error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = async () => {
    setIsOpen(true);
    setArtifactName("");
    
    // Automatically suggest a name if we have the required data
    if (conversationId && previewData?.type && (previewData?.url || previewData?.filename)) {
      await suggestName();
    }
  };

  const suggestName = async () => {
    if (!conversationId || !previewData?.type || (!previewData?.url && !previewData?.filename)) {
      return;
    }

    setIsSuggestingName(true);
    try {
      const response = await suggestArtifactName(conversationId, {
        type: previewData.type,
        filepath: previewData.url || previewData.filename || ""
      });
      
      if (response.suggested_name && response.suggested_name !== "New Creation") {
        setArtifactName(response.suggested_name);
      }
    } catch (error) {
      console.error("Name suggestion error:", error);
      // Don't show error toast for name suggestion failures - just use default
    } finally {
      setIsSuggestingName(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenDialog}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Save Creation"
        >
          <Save className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Creation</DialogTitle>
          <DialogDescription>
            Enter a name for this creation. It will be saved to your list of creations.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="artifact-name" className="text-right">
              Name
            </Label>
            <div className="col-span-3">
              <Input
                id="artifact-name"
                value={artifactName}
                onChange={(e) => setArtifactName(e.target.value)}
                className="w-full"
                placeholder="Enter creation name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveArtifact();
                  }
                }}
                disabled={isSuggestingName}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading || isSuggestingName}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveArtifact}
            disabled={!artifactName.trim()}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveArtifactButton; 