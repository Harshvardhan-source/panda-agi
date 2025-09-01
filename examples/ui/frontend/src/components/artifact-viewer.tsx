import React, { useState, useEffect, useRef, useCallback } from "react";
import FileIcon from "./ui/file-icon";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getApiHeaders } from "@/lib/api/common";
import { updateArtifact } from "@/lib/api/artifacts";
import { ArtifactData, ArtifactViewerCallbacks } from "@/types/artifact";
import ArtifactActions from "./artifact-actions";
import {
  X,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Link2,
  Hash,
  Unlink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { createLowlight } from "lowlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import { SlashCommand, slashCommandSuggestion } from "./slash-command-extension";
import "./tiptap-editor.css";

// Re-export from types for backward compatibility
export type { ArtifactData };

interface ArtifactViewerProps extends ArtifactViewerCallbacks {
  isOpen: boolean;
  onClose: () => void;
  artifact?: ArtifactData;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({
  isOpen,
  onClose,
  artifact,
  onArtifactUpdated,
  onArtifactDeleted,
}) => {
  // State for file content
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [titleEditJustTriggered, setTitleEditJustTriggered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [, forceUpdate] = useState({});
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fileBaseUrl = `${window.location.origin}/creations/${artifact?.id}/`;

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
  }, [artifact, fileBaseUrl]);

  // Handle title change
  const handleTitleChange = async (newTitle: string) => {
    if (!artifact) return;

    try {
      await updateArtifact(artifact.id, {
        name: newTitle,
      });

      // Update the artifact locally without triggering a full reload
      artifact.name = newTitle;
    } catch (error) {
      console.error("Failed to update artifact title:", error);
      throw error;
    }
  };

  // Handle edit title
  const handleEditTitle = () => {
    setTitleEditJustTriggered(true);
    setIsEditingTitle(true);
    // Clear the flag after a short delay and focus the input
    setTimeout(() => {
      setTitleEditJustTriggered(false);
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 200);
  };

  const handleSaveTitle = async (newTitle: string) => {
    await handleTitleChange(newTitle);
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
  };

  // Handle close with confirmation
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (!confirmed) return;
    }
    onClose();
  };

  // Tiptap editor setup
  const lowlight = createLowlight();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Typography,
      Placeholder.configure({
        placeholder: "Type '/' for commands or click to start writing...",
      }),
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: null,
          class: "editor-link",
        },
      }),
      Image,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      HorizontalRule,
      SlashCommand.configure({
        suggestion: slashCommandSuggestion,
      }),
    ],
    content: fileContent || "",
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      const hasChanges = content !== fileContent;
      setHasUnsavedChanges(hasChanges);
      if (hasChanges) {
        setJustSaved(false);
      }

      // Update word count
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      setWordCount(words.length);

      // Update button states
      forceUpdate({});
    },
    onSelectionUpdate: () => {
      // Force re-render to update button states
      forceUpdate({});
    },
  });

  // Custom markdown parser that preserves empty lines
  const parseMarkdownWithEmptyLines = (markdown: string): string => {
    if (!markdown) return "";

    const lines = markdown.split("\n");
    const htmlLines: string[] = [];
    let inList = false;
    let listType = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Empty line - preserve it and close any open list
      if (line.trim() === "") {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        htmlLines.push("<p></p>");
        continue;
      }

      let processedLine = line;

      // Headers
      if (line.startsWith("### ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h3>${line.substring(4)}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h2>${line.substring(3)}</h2>`;
      } else if (line.startsWith("# ")) {
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = `<h1>${line.substring(2)}</h1>`;
      } else if (line.trim().startsWith("- ")) {
        // Unordered list item
        if (!inList || listType !== "ul") {
          if (inList) htmlLines.push(`</${listType}>`);
          htmlLines.push("<ul>");
          inList = true;
          listType = "ul";
        }
        const listItemContent = line
          .trim()
          .substring(2)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<li>${listItemContent}</li>`;
      } else if (/^\d+\.\s/.test(line.trim())) {
        // Numbered list item (1. 2. 3. etc.)
        if (!inList || listType !== "ol") {
          if (inList) htmlLines.push(`</${listType}>`);
          htmlLines.push("<ol>");
          inList = true;
          listType = "ol";
        }
        const listItemContent = line
          .trim()
          .replace(/^\d+\.\s/, "")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<li>${listItemContent}</li>`;
      } else {
        // Regular content
        if (inList) {
          htmlLines.push(`</${listType}>`);
          inList = false;
          listType = "";
        }
        processedLine = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");
        processedLine = `<p>${processedLine}</p>`;
      }

      htmlLines.push(processedLine);
    }

    // Close any remaining open list
    if (inList) {
      htmlLines.push(`</${listType}>`);
    }

    return htmlLines.join("");
  };

  // Update editor content when file content changes
  useEffect(() => {
    if (editor && fileContent !== null) {
      // Use our custom parser that preserves empty lines
      const htmlContent = parseMarkdownWithEmptyLines(fileContent);
      editor.commands.setContent(htmlContent);
      setHasUnsavedChanges(false);

      // Focus the editor after content is set
      if (isOpen) {
        setTimeout(() => {
          editor.commands.focus("start");
        }, 200);
      }

      // Update initial word count
      const text = editor.getText();
      const words = text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0);
      setWordCount(words.length);
    }
  }, [editor, fileContent, isOpen]);

  // Handle editing existing link URL
  const handleEditLinkUrl = useCallback(() => {
    if (!editor) return;

    const attrs = editor.getAttributes("link");
    setLinkUrl(attrs.href || "");
    setShowLinkDialog(true);
  }, [editor]);

  const handleSaveContent = async () => {
    if (!artifact || !hasUnsavedChanges || !editor || isSaving) return;

    setIsSaving(true);
    try {
      // For markdown files, we should convert HTML back to markdown
      // For now, let's save the raw content from the editor
      const content =
        getFileType(artifact.filepath) === "markdown"
          ? htmlToMarkdown(editor.getHTML())
          : editor.getHTML();

      const response = await fetch(
        `${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "text/plain",
            ...(await getApiHeaders()),
          },
          body: content,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }

      setFileContent(content);
      setHasUnsavedChanges(false);
      setJustSaved(true);

      // Reset the "just saved" state after 2 seconds
      setTimeout(() => {
        setJustSaved(false);
      }, 2000);
    } catch (err) {
      console.error("Error saving content:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save content";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Simple HTML to markdown converter
  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1>(.*?)<\/h1>/g, "# $1")
      .replace(/<h2>(.*?)<\/h2>/g, "## $1")
      .replace(/<h3>(.*?)<\/h3>/g, "### $1")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<code>(.*?)<\/code>/g, "`$1`")
      .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "") // Remove any remaining HTML tags
      .trim();
  };

  // Handle link insertion
  const handleLinkClick = () => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to) || "";

    // Check if the current selection is within a link
    const isInLink = editor.isActive("link");

    if (isInLink) {
      // Remove existing link from current selection/cursor position
      editor.chain().focus().unsetLink().run();
    } else {
      // Show dialog to add link
      setLinkUrl(selectedText.startsWith("http") ? selectedText : "");
      setShowLinkDialog(true);
    }
  };

  const handleLinkSubmit = () => {
    if (linkUrl && editor) {
      // If we're editing an existing link, we need to update the entire link
      if (editor.isActive("link")) {
        // Select the entire link first, then update its URL
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: linkUrl })
          .run();
      } else {
        // Creating a new link
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  const handleUnlink = () => {
    if (editor) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  // Helper component for tooltip-wrapped toolbar buttons
  const ToolbarButton = ({ 
    onClick, 
    disabled = false, 
    isActive = false, 
    tooltip, 
    children 
  }: {
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    tooltip: string;
    children: React.ReactNode;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : isActive
              ? "bg-gray-200 dark:bg-gray-700 text-blue-600 dark:text-blue-400"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Toolbar component
  const Toolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

    return (
      <TooltipProvider>
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-1">
            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              tooltip="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              tooltip="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive("code")}
              tooltip="Inline Code"
            >
              <Code className="w-4 h-4" />
            </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Headings */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive("heading", { level: 1 })}
              tooltip="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive("heading", { level: 2 })}
              tooltip="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive("heading", { level: 3 })}
              tooltip="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              tooltip="Bullet List"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              tooltip="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Link */}
            <ToolbarButton
              onClick={editor.isActive("link") ? handleEditLinkUrl : handleLinkClick}
              isActive={editor.isActive("link")}
              tooltip={editor.isActive("link") ? "Edit Link" : "Add Link"}
            >
              <Link2 className="w-4 h-4" />
            </ToolbarButton>

            {/* Quote */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive("blockquote")}
              tooltip="Quote"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>
          </div>

          {/* Word count */}
          <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center space-x-1">
              <Hash className="w-4 h-4" />
              <span>{wordCount} words</span>
            </span>
          </div>
        </div>
      </TooltipProvider>
    );
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

    switch (type) {
      case "markdown":
        return (
          <>
            <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
              <Toolbar editor={editor} />
              <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg">
                  <div className="px-16 py-12">
                    <EditorContent
                      editor={editor}
                      className="tiptap-editor focus:outline-none cursor-text"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Link Dialog */}
            {showLinkDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    {editor?.isActive("link") ? "Edit Link" : "Add Link"}
                  </h3>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter URL..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleLinkSubmit();
                      } else if (e.key === "Escape") {
                        setShowLinkDialog(false);
                        setLinkUrl("");
                      }
                    }}
                  />
                  <div className="flex justify-between">
                    <div>
                      {editor?.isActive("link") && (
                        <Button
                          onClick={handleUnlink}
                          variant="outline"
                          size="sm"
                          className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Unlink className="w-4 h-4 mr-2" />
                          Remove Link
                        </Button>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setShowLinkDialog(false);
                          setLinkUrl("");
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleLinkSubmit}
                        size="sm"
                        disabled={!linkUrl.trim()}
                      >
                        {editor?.isActive("link") ? "Update Link" : "Add Link"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case "iframe":
        return (
          <div className="h-full">
            <iframe
              src={`${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`}
              className="w-full h-full border-0"
              title={artifact.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        );
      default:
        return (
          <div className="h-full overflow-auto">
            <div className="max-w-none mx-auto px-8 py-6">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
                <code className="text-gray-800 dark:text-gray-200">
                  {fileContent || ""}
                </code>
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Full-screen editor modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div
          className="w-full h-full max-w-7xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <FileIcon
                filepath={artifact.filepath}
                className="w-5 h-5 text-blue-500 flex-shrink-0"
              />
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  defaultValue={artifact.name}
                  className="flex-1 px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 focus:border-gray-400 dark:focus:border-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle(e.currentTarget.value);
                    } else if (e.key === "Escape") {
                      handleCancelTitleEdit();
                    }
                  }}
                  onBlur={(e) => {
                    if (!titleEditJustTriggered) {
                      handleSaveTitle(e.currentTarget.value);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 inline-block"
                    onClick={handleEditTitle}
                    title="Click to edit title"
                  >
                    {artifact.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {artifact.filepath}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {justSaved && !hasUnsavedChanges ? (
                <span className="text-sm text-gray-600 dark:text-gray-400 px-3 py-1">
                  Saved
                </span>
              ) : hasUnsavedChanges ? (
                <Button
                  onClick={handleSaveContent}
                  size="sm"
                  title="Save changes"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              ) : null}

              <ArtifactActions
                artifact={artifact}
                onArtifactUpdated={onArtifactUpdated}
                onArtifactDeleted={onArtifactDeleted}
                onClose={onClose}
                onEditName={handleEditTitle}
              />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
                title="Close editor"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="text-red-500 text-lg mb-2">⚠️ Error</div>
                  <p className="text-gray-600 dark:text-gray-400">{error}</p>
                </div>
              </div>
            ) : (
              <div className="h-full">{renderContent()}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ArtifactViewer;
