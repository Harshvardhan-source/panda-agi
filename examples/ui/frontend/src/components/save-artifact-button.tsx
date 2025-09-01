import React, { useState, useRef } from "react";
import { Save, Sparkles } from "lucide-react";
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
import { saveArtifact, suggestArtifactName, ArtifactResponse } from "@/lib/api/artifacts";

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
  onSave?: (artifactData: { artifact: ArtifactResponse, detail: string }) => void;
}

const SaveArtifactButton: React.FC<SaveArtifactButtonProps> = ({
  conversationId,
  previewData,
  onSave,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [artifactName, setArtifactName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [userHasEdited, setUserHasEdited] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
      const savedArtifact = await saveArtifact(conversationId, {
        type: previewData?.type || "text",
        name: artifactName.trim(),
        filepath: previewData?.url || previewData?.filename || ""
      });
      toast.success("Creation saved successfully!");
      setIsOpen(false);
      setArtifactName("");
      
      // Call the onSave callback with the saved artifact data
      if (onSave) {
        onSave(savedArtifact);
      }
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
    setUserHasEdited(false);
    
    // Automatically suggest a name if we have the required data
    if (conversationId && previewData?.type && (previewData?.url || previewData?.filename)) {
      await suggestName();
    }
  };

  const suggestName = async () => {
    if (!conversationId || !previewData?.type || (!previewData?.url && !previewData?.filename)) {
      return;
    }

    // Cancel any existing suggestion request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsSuggestingName(true);
    try {
      const response = await suggestArtifactName(conversationId, {
        type: previewData.type,
        filepath: previewData.url || previewData.filename || ""
      }, abortControllerRef.current.signal);
      
      // Check if user has started typing during the API call
      if (response.suggested_name && !userHasEdited) {
        setArtifactName(response.suggested_name);
        // Select all text after setting the value
        setTimeout(() => {
          if (inputRef.current && !userHasEdited) {
            inputRef.current.select();
            inputRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      // Only log error if it's not an abort error
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error("Name suggestion error:", error);
      }
      // Don't show error toast for name suggestion failures - just use default
    } finally {
      setIsSuggestingName(false);
      abortControllerRef.current = null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setArtifactName(newValue);
    
    // If user starts typing and we're currently suggesting a name, cancel the request
    if (isSuggestingName && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsSuggestingName(false);
    }
    
    setUserHasEdited(true);
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
            <div className="col-span-3 relative">
              <Input
                ref={inputRef}
                id="artifact-name"
                value={artifactName}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter creation name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveArtifact();
                  }
                }}
              />
              {isSuggestingName && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Sparkles className="w-3 h-3 text-gray-400 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveArtifact}
            disabled={!artifactName.trim() || isLoading}
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveArtifactButton; 