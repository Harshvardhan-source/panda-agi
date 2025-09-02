import React, { useState, useEffect, useRef, useCallback } from "react";
import FileIcon from "./ui/file-icon";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { getApiHeaders } from "@/lib/api/common";
import { updateArtifact, updateArtifactFile } from "@/lib/api/artifacts";
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
  Plus,
  GripVertical,
  GripHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Eraser,
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

import { unified } from "unified"

// Markdown → HTML
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"

// HTML → Markdown
import rehypeParse from "rehype-parse"
import rehypeRemark from "rehype-remark"
import remarkStringify from "remark-stringify"

// Markdown → HTML
export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)

  return String(file).trim()
}

// HTML → Markdown
export async function htmlToMarkdown(html: string): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark) 
    .use(remarkStringify)
    .process(html)

  return String(file)
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
  const [hoveredTable, setHoveredTable] = useState<HTMLTableElement | null>(null);
  const [tablePosition, setTablePosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [hoveredRow, setHoveredRow] = useState<{ index: number; element: HTMLElement; top: number; height: number } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<{ index: number; left: number; width: number } | null>(null);
  const [showRowDropdown, setShowRowDropdown] = useState<{ index: number; top: number; left: number } | null>(null);
  const [showColumnDropdown, setShowColumnDropdown] = useState<{ index: number; top: number; left: number } | null>(null);
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
    // Clean up table controls when closing
    cleanupTableControls();
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
    content: "",
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

      // Refresh table listeners after content changes
      setTimeout(() => {
        // Clean up any existing table controls first
        cleanupTableControls();
        setupTableHoverListeners();
      }, 100);
    },
    onSelectionUpdate: () => {
      // Force re-render to update button states
      forceUpdate({});
    },
  });

  // Clean up table controls when tables are removed
  const cleanupTableControls = useCallback(() => {
    setHoveredTable(null);
    setTablePosition(null);
    setHoveredRow(null);
    setHoveredColumn(null);
    setShowRowDropdown(null);
    setShowColumnDropdown(null);
  }, []);

  // Set up row and column hover listeners
  const setupRowColumnListeners = useCallback((table: HTMLTableElement, containerRect: DOMRect) => {
    // Set up row listeners
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const htmlRow = row as HTMLElement;
      const rowRect = htmlRow.getBoundingClientRect();
      
      htmlRow.addEventListener('mouseenter', () => {
        setHoveredRow({
          index,
          element: htmlRow,
          top: rowRect.top - containerRect.top,
          height: rowRect.height,
        });
      });
      
      htmlRow.addEventListener('mouseleave', () => {
        // Don't hide immediately, let the invisible hover zone handle it
      });
    });

    // Set up column listeners by tracking cell hovers
    const firstRow = rows[0];
    if (firstRow) {
      const cells = firstRow.querySelectorAll('td, th');
      cells.forEach((cell, index) => {
        const htmlCell = cell as HTMLElement;
        const cellRect = htmlCell.getBoundingClientRect();
        
        htmlCell.addEventListener('mouseenter', () => {
          setHoveredColumn({
            index,
            left: cellRect.left - containerRect.left,
            width: cellRect.width,
          });
        });
        
        htmlCell.addEventListener('mouseleave', () => {
          // Don't hide immediately, let the invisible hover zone handle it
        });
      });
    }
  }, []);

  // Set up table hover listeners
  const setupTableHoverListeners = useCallback(() => {
    if (!editor) return;

    const editorElement = document.querySelector('.tiptap-editor .ProseMirror');
    if (!editorElement) return;

    const editorContainer = document.querySelector('.px-16.py-12');
    if (!editorContainer) return;

    const tables = editorElement.querySelectorAll('table');
    
    // If no tables exist, clean up any lingering controls
    if (tables.length === 0) {
      cleanupTableControls();
      return;
    }
    
    const handleMouseEnter = (table: HTMLTableElement) => {
      const containerRect = editorContainer.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      
      setHoveredTable(table);
      setTablePosition({
        top: tableRect.top - containerRect.top,
        left: tableRect.left - containerRect.left,
        width: tableRect.width,
        height: tableRect.height,
      });

      // Set up row and column hover listeners
      setupRowColumnListeners(table, containerRect);
    };

    const handleMouseLeave = () => {
      // Don't hide immediately, let the invisible hover zone handle it
    };

    tables.forEach(table => {
      const htmlTable = table as HTMLTableElement;
      htmlTable.addEventListener('mouseenter', () => handleMouseEnter(htmlTable));
      htmlTable.addEventListener('mouseleave', handleMouseLeave);
    });

    // Cleanup function
    return () => {
      tables.forEach(table => {
        const htmlTable = table as HTMLTableElement;
        htmlTable.removeEventListener('mouseenter', () => handleMouseEnter(htmlTable));
        htmlTable.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [editor, setupRowColumnListeners, cleanupTableControls]);

  // Add table controls
  const handleAddRow = useCallback(() => {
    if (!editor || !hoveredTable) return;
    
    // Move cursor to last cell of the table to ensure we add at the end
    const rows = hoveredTable.querySelectorAll('tr');
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const cells = lastRow.querySelectorAll('td, th');
      if (cells.length > 0) {
        const lastCell = cells[cells.length - 1];
        // Focus the last cell and then add row after it
        const pos = editor.view.posAtDOM(lastCell, 0);
        editor.commands.setTextSelection(pos);
      }
    }
    
    editor.chain().focus().addRowAfter().run();
    setTimeout(() => setupTableHoverListeners(), 100);
  }, [editor, setupTableHoverListeners, hoveredTable]);

  const handleAddColumn = useCallback(() => {
    if (!editor || !hoveredTable) return;
    
    // Move cursor to last cell of the first row to ensure we add at the end
    const rows = hoveredTable.querySelectorAll('tr');
    if (rows.length > 0) {
      const firstRow = rows[0];
      const cells = firstRow.querySelectorAll('td, th');
      if (cells.length > 0) {
        const lastCell = cells[cells.length - 1];
        // Focus the last cell of the first row and then add column after it
        const pos = editor.view.posAtDOM(lastCell, 0);
        editor.commands.setTextSelection(pos);
      }
    }
    
    editor.chain().focus().addColumnAfter().run();
    setTimeout(() => setupTableHoverListeners(), 100);
  }, [editor, setupTableHoverListeners, hoveredTable]);

  // Dropdown handlers
  const handleShowRowDropdown = useCallback((rowIndex: number, buttonTop: number, buttonLeft: number) => {
    setShowRowDropdown({
      index: rowIndex,
      top: buttonTop,
      left: buttonLeft + 25, // Position to the right of the button
    });
    setShowColumnDropdown(null); // Close other dropdown
  }, []);

  const handleShowColumnDropdown = useCallback((columnIndex: number, buttonTop: number, buttonLeft: number) => {
    setShowColumnDropdown({
      index: columnIndex,
      top: buttonTop + 25, // Position below the button
      left: buttonLeft,
    });
    setShowRowDropdown(null); // Close other dropdown
  }, []);

  // Table operation functions
  const handleRowOperation = useCallback((operation: string, rowIndex: number) => {
    if (!editor || !hoveredTable) return;
    
    const rows = hoveredTable.querySelectorAll('tr');
    const targetRow = rows[rowIndex];
    if (!targetRow) return;

    // Position cursor in the target row
    const cells = targetRow.querySelectorAll('td, th');
    if (cells.length > 0) {
      const pos = editor.view.posAtDOM(cells[0], 0);
      editor.commands.setTextSelection(pos);
    }

    switch (operation) {
      case 'addBefore':
        editor.chain().focus().addRowBefore().run();
        break;
      case 'addAfter':
        editor.chain().focus().addRowAfter().run();
        break;
      case 'duplicate':
        // First add a row after
        editor.chain().focus().addRowAfter().run();
        
        // Wait for the DOM to update, then copy content
        setTimeout(() => {
          const rows = hoveredTable.querySelectorAll('tr');
          const sourceRow = rows[rowIndex];
          const newRow = rows[rowIndex + 1];
          
          if (sourceRow && newRow) {
            const sourceCells = sourceRow.querySelectorAll('td, th');
            const newCells = newRow.querySelectorAll('td, th');
            
            // Copy each cell's content sequentially to avoid race conditions
            let cellIndex = 0;
            const copyCellContent = () => {
              if (cellIndex < sourceCells.length) {
                const sourceCell = sourceCells[cellIndex];
                const newCell = newCells[cellIndex];
                
                if (sourceCell && newCell && sourceCell.textContent) {
                  const content = sourceCell.textContent.trim();
                  if (content) {
                    // Clear and set content directly using innerHTML to avoid ProseMirror race conditions
                    newCell.innerHTML = `<p>${content}</p>`;
                  }
                }
                cellIndex++;
                setTimeout(copyCellContent, 10); // Small delay between cells
              }
            };
            copyCellContent();
          }
        }, 50);
        break;
      case 'clear':
        // Clear all cells in the row
        const cells = targetRow.querySelectorAll('td, th');
        cells.forEach((cell) => {
          if (cell.textContent && cell.textContent.trim() !== '') {
            try {
              const startPos = editor.view.posAtDOM(cell, 0);
              const endPos = editor.view.posAtDOM(cell, cell.childNodes.length);
              editor.commands.setTextSelection({ from: startPos, to: endPos });
              editor.commands.deleteSelection();
            } catch {
              // Fallback: directly clear the cell content
              cell.innerHTML = '';
            }
          }
        });
        break;
      case 'delete':
        editor.chain().focus().deleteRow().run();
        break;
    }
    
    setShowRowDropdown(null);
    setTimeout(() => {
      cleanupTableControls();
      setupTableHoverListeners();
    }, 100);
  }, [editor, hoveredTable, setupTableHoverListeners, cleanupTableControls]);

  const handleColumnOperation = useCallback((operation: string, columnIndex: number) => {
    if (!editor || !hoveredTable) return;
    
    const rows = hoveredTable.querySelectorAll('tr');
    if (rows.length === 0) return;

    // Position cursor in the target column
    const targetCell = rows[0].querySelectorAll('td, th')[columnIndex];
    if (targetCell) {
      const pos = editor.view.posAtDOM(targetCell, 0);
      editor.commands.setTextSelection(pos);
    }

    switch (operation) {
      case 'addBefore':
        editor.chain().focus().addColumnBefore().run();
        break;
      case 'addAfter':
        editor.chain().focus().addColumnAfter().run();
        break;
      case 'duplicate':
        // First add a column after
        editor.chain().focus().addColumnAfter().run();
        
        // Wait for the DOM to update, then copy content
        setTimeout(() => {
          const rows = hoveredTable.querySelectorAll('tr');
          
          // Copy each row's cell content sequentially to avoid race conditions
          let rowIndex = 0;
          const copyRowContent = () => {
            if (rowIndex < rows.length) {
              const row = rows[rowIndex];
              const cells = row.querySelectorAll('td, th');
              const sourceCell = cells[columnIndex];
              const newCell = cells[columnIndex + 1];
              
              if (sourceCell && newCell && sourceCell.textContent) {
                const content = sourceCell.textContent.trim();
                if (content) {
                  // Clear and set content directly using innerHTML to avoid ProseMirror race conditions
                  newCell.innerHTML = `<p>${content}</p>`;
                }
              }
              rowIndex++;
              setTimeout(copyRowContent, 10); // Small delay between rows
            }
          };
          copyRowContent();
        }, 50);
        break;
      case 'clear':
        // Clear all cells in the column
        const allRows = hoveredTable.querySelectorAll('tr');
        allRows.forEach((row) => {
          const cell = row.querySelectorAll('td, th')[columnIndex];
          if (cell && cell.textContent && cell.textContent.trim() !== '') {
            try {
              const startPos = editor.view.posAtDOM(cell, 0);
              const endPos = editor.view.posAtDOM(cell, cell.childNodes.length);
              editor.commands.setTextSelection({ from: startPos, to: endPos });
              editor.commands.deleteSelection();
            } catch {
              // Fallback: directly clear the cell content
              cell.innerHTML = '';
            }
          }
        });
        break;
      case 'delete':
        editor.chain().focus().deleteColumn().run();
        break;
    }
    
    setShowColumnDropdown(null);
    setTimeout(() => {
      cleanupTableControls();
      setupTableHoverListeners();
    }, 100);
  }, [editor, hoveredTable, setupTableHoverListeners, cleanupTableControls]);

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
      // Convert markdown to HTML using the markdownToHtml function
      const convertContent = async () => {
        try {
          const htmlContent = await markdownToHtml(fileContent);
          editor.commands.setContent(htmlContent);
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error("Error converting markdown to HTML:", error);
          // Fallback to the custom parser if markdownToHtml fails
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

          // Set up table hover listeners
          setTimeout(() => {
            // Clean up any existing table controls first
            cleanupTableControls();
            setupTableHoverListeners();
          }, 100);
        }
      };
      
      convertContent();
    }
  }, [editor, fileContent, isOpen, setupTableHoverListeners, cleanupTableControls]);

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
          ? await htmlToMarkdown(editor.getHTML())
          : editor.getHTML();

      await updateArtifactFile(artifact.id, artifact.filepath, content);

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
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-sm hover:shadow-md transition-shadow duration-200 rounded-lg relative">
                  <div className="px-16 py-12">
                    <EditorContent
                      editor={editor}
                      className="tiptap-editor focus:outline-none cursor-text"
                    />
                    {/* Table Controls */}
                    {hoveredTable && tablePosition && (
                      <>
                        {/* Invisible hover zone that extends beyond the table */}
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            left: tablePosition.left - 20,
                            top: tablePosition.top - 20,
                            width: tablePosition.width + 60,
                            height: tablePosition.height + 60,
                            zIndex: 1,
                          }}
                          onMouseLeave={() => {
                            setHoveredTable(null);
                            setTablePosition(null);
                          }}
                        >
                          {/* Only the outer border area should capture mouse events */}
                          <div
                            className="pointer-events-auto"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '20px',
                            }}
                          />
                          <div
                            className="pointer-events-auto"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '20px',
                            }}
                          />
                          <div
                            className="pointer-events-auto"
                            style={{
                              position: 'absolute',
                              top: '20px',
                              bottom: '20px',
                              left: 0,
                              width: '20px',
                            }}
                          />
                          <div
                            className="pointer-events-auto"
                            style={{
                              position: 'absolute',
                              top: '20px',
                              bottom: '20px',
                              right: 0,
                              width: '20px',
                            }}
                          />
                        </div>
                        {/* Add Column Button (positioned on right side) */}
                        <button
                          onClick={handleAddColumn}
                          className="absolute bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md p-1.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
                          style={{
                            left: tablePosition.left + tablePosition.width - 12,
                            top: tablePosition.top + tablePosition.height / 2 - 12,
                            zIndex: 20,
                          }}
                          title="Add column"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {/* Add Row Button (positioned on bottom) */}
                        <button
                          onClick={handleAddRow}
                          className="absolute bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-md p-1.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md"
                          style={{
                            left: tablePosition.left + tablePosition.width / 2 - 12,
                            top: tablePosition.top + tablePosition.height - 12,
                            zIndex: 20,
                          }}
                          title="Add row"
                        >
                          <Plus className="w-3 h-3" />
                        </button>

                        {/* Row Selection Button */}
                        {hoveredRow && (
                          <>
                            {/* Invisible hover zone for row */}
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: tablePosition.left - 15,
                                top: hoveredRow.top - 5,
                                width: tablePosition.width + 20,
                                height: hoveredRow.height + 10,
                                zIndex: 1,
                              }}
                              onMouseLeave={() => {
                                setHoveredRow(null);
                              }}
                            >
                              {/* Only the left margin area captures mouse events */}
                              <div
                                className="pointer-events-auto"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '15px',
                                  height: '100%',
                                }}
                              />
                            </div>
                            <button
                              onClick={() => handleShowRowDropdown(
                                hoveredRow.index,
                                hoveredRow.top + hoveredRow.height / 2 - 8,
                                tablePosition.left - 8
                              )}
                              className="absolute bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-200 dark:hover:border-gray-600 rounded-sm p-0.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md opacity-60 hover:opacity-100"
                              style={{
                                left: tablePosition.left - 8,
                                top: hoveredRow.top + hoveredRow.height / 2 - 8,
                                zIndex: 20,
                              }}
                              title="Row options"
                            >
                              <GripVertical className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}

                        {/* Column Selection Button */}
                        {hoveredColumn && (
                          <>
                            {/* Invisible hover zone for column */}
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                left: hoveredColumn.left - 5,
                                top: tablePosition.top - 15,
                                width: hoveredColumn.width + 10,
                                height: tablePosition.height + 20,
                                zIndex: 1,
                              }}
                              onMouseLeave={() => {
                                setHoveredColumn(null);
                              }}
                            >
                              {/* Only the top margin area captures mouse events */}
                              <div
                                className="pointer-events-auto"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '15px',
                                }}
                              />
                            </div>
                            <button
                              onClick={() => handleShowColumnDropdown(
                                hoveredColumn.index,
                                tablePosition.top - 8,
                                hoveredColumn.left + hoveredColumn.width / 2 - 8
                              )}
                              className="absolute bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 border border-gray-200/50 dark:border-gray-600/50 hover:border-gray-200 dark:hover:border-gray-600 rounded-sm p-0.5 shadow-sm transition-all duration-200 cursor-pointer hover:shadow-md opacity-60 hover:opacity-100"
                              style={{
                                left: hoveredColumn.left + hoveredColumn.width / 2 - 8,
                                top: tablePosition.top - 8,
                                zIndex: 20,
                              }}
                              title="Column options"
                            >
                              <GripHorizontal className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}

                        {/* Row Dropdown Menu */}
                        {showRowDropdown && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowRowDropdown(null)}
                            />
                            <div
                              className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-30 min-w-48"
                              style={{
                                top: showRowDropdown.top,
                                left: showRowDropdown.left,
                              }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => handleRowOperation('addBefore', showRowDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                  <span>Add row above</span>
                                </button>
                                <button
                                  onClick={() => handleRowOperation('addAfter', showRowDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                  <span>Add row below</span>
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                  onClick={() => handleRowOperation('duplicate', showRowDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Copy className="w-4 h-4" />
                                  <span>Duplicate row</span>
                                </button>
                                <button
                                  onClick={() => handleRowOperation('clear', showRowDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Eraser className="w-4 h-4" />
                                  <span>Clear content</span>
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                  onClick={() => handleRowOperation('delete', showRowDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete row</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Column Dropdown Menu */}
                        {showColumnDropdown && (
                          <>
                            {/* Backdrop to close dropdown */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowColumnDropdown(null)}
                            />
                            <div
                              className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-30 min-w-48"
                              style={{
                                top: showColumnDropdown.top,
                                left: showColumnDropdown.left,
                              }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => handleColumnOperation('addBefore', showColumnDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                  <span>Add column left</span>
                                </button>
                                <button
                                  onClick={() => handleColumnOperation('addAfter', showColumnDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                  <span>Add column right</span>
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                  onClick={() => handleColumnOperation('duplicate', showColumnDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Copy className="w-4 h-4" />
                                  <span>Duplicate column</span>
                                </button>
                                <button
                                  onClick={() => handleColumnOperation('clear', showColumnDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Eraser className="w-4 h-4" />
                                  <span>Clear content</span>
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                  onClick={() => handleColumnOperation('delete', showColumnDropdown.index)}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete column</span>
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
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