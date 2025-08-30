import React, { useState, useEffect } from "react";
import MarkdownRenderer from "./ui/markdown-renderer";
import FileIcon from "./ui/file-icon";
import { getApiHeaders } from "@/lib/api/common";
import { updateArtifact } from "@/lib/api/artifacts";
import { ArtifactData, ArtifactViewerCallbacks } from "@/types/artifact";
import ArtifactActions from "./artifact-actions";
import { X } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { createLowlight } from 'lowlight';
import Typography from '@tiptap/extension-typography';

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

  // Simple markdown to HTML converter for basic formatting
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Line breaks - convert double line breaks to paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Single line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs if not already wrapped
    if (!html.includes('<h') && !html.includes('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    return html;
  };

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
      const updatedArtifact = await updateArtifact(artifact.id, {
        name: newTitle,
      });
      const newArtifactData: ArtifactData = {
        ...artifact,
        name: updatedArtifact.name,
      };

      if (onArtifactUpdated) {
        onArtifactUpdated(newArtifactData);
      }
    } catch (error) {
      console.error("Failed to update artifact title:", error);
      throw error;
    }
  };

  // Handle edit title
  const handleEditTitle = () => {
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async (newTitle: string) => {
    await handleTitleChange(newTitle);
    setIsEditingTitle(false);
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
  };

  // Tiptap editor setup
  const lowlight = createLowlight();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Typography,
      Link.configure({
        openOnClick: false,
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
    ],
    content: fileContent || '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setHasUnsavedChanges(content !== fileContent);
    },
  });

  // Update editor content when file content changes
  useEffect(() => {
    if (editor && fileContent !== null) {
      const htmlContent = markdownToHtml(fileContent);
      editor.commands.setContent(htmlContent);
      setHasUnsavedChanges(false);
    }
  }, [editor, fileContent]);

  const handleSaveContent = async () => {
    if (!artifact || !hasUnsavedChanges || !editor) return;
    
    try {
      // For markdown files, we should convert HTML back to markdown
      // For now, let's save the raw content from the editor
      const content = getFileType(artifact.filepath) === 'markdown' 
        ? htmlToMarkdown(editor.getHTML())
        : editor.getHTML();
        
      const response = await fetch(`${fileBaseUrl}${encodeURIComponent(artifact.filepath)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          ...(await getApiHeaders())
        },
        body: content
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save: ${response.status}`);
      }
      
      setFileContent(content);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error saving content:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  
  // Simple HTML to markdown converter
  const htmlToMarkdown = (html: string): string => {
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .trim();
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
          <div className="h-full p-6 overflow-auto bg-gray-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 min-h-full shadow-sm">
              <div className="px-16 py-12">
                <EditorContent 
                  editor={editor} 
                  className="tiptap-editor focus:outline-none"
                />
                <style jsx global>{`
                  .tiptap-editor .ProseMirror {
                    outline: none;
                    padding: 0;
                    min-height: 400px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    color: #1f2937;
                  }
                  
                  .dark .tiptap-editor .ProseMirror {
                    color: #f9fafb;
                  }
                  
                  /* Headings */
                  .tiptap-editor .ProseMirror h1 {
                    font-size: 2.25rem;
                    font-weight: 600;
                    line-height: 1.2;
                    margin: 2rem 0 1.5rem 0;
                    color: #111827;
                  }
                  .dark .tiptap-editor .ProseMirror h1 {
                    color: #f9fafb;
                  }
                  
                  .tiptap-editor .ProseMirror h2 {
                    font-size: 1.875rem;
                    font-weight: 600;
                    line-height: 1.3;
                    margin: 1.75rem 0 1rem 0;
                    color: #111827;
                  }
                  .dark .tiptap-editor .ProseMirror h2 {
                    color: #f9fafb;
                  }
                  
                  .tiptap-editor .ProseMirror h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    line-height: 1.4;
                    margin: 1.5rem 0 0.75rem 0;
                    color: #111827;
                  }
                  .dark .tiptap-editor .ProseMirror h3 {
                    color: #f9fafb;
                  }
                  
                  .tiptap-editor .ProseMirror h4 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    line-height: 1.5;
                    margin: 1.25rem 0 0.5rem 0;
                    color: #111827;
                  }
                  .dark .tiptap-editor .ProseMirror h4 {
                    color: #f9fafb;
                  }
                  
                  /* Paragraphs */
                  .tiptap-editor .ProseMirror p {
                    line-height: 1.7;
                    margin-bottom: 1.25rem;
                    font-size: 1rem;
                    color: #374151;
                  }
                  .dark .tiptap-editor .ProseMirror p {
                    color: #d1d5db;
                  }
                  
                  /* Lists */
                  .tiptap-editor .ProseMirror ul,
                  .tiptap-editor .ProseMirror ol {
                    padding-left: 1.5rem;
                    margin-bottom: 1.25rem;
                  }
                  
                  .tiptap-editor .ProseMirror li {
                    margin-bottom: 0.5rem;
                    line-height: 1.7;
                    color: #374151;
                  }
                  .dark .tiptap-editor .ProseMirror li {
                    color: #d1d5db;
                  }
                  
                  /* Blockquotes */
                  .tiptap-editor .ProseMirror blockquote {
                    border-left: 4px solid #3b82f6;
                    padding-left: 1.5rem;
                    margin: 2rem 0;
                    font-style: italic;
                    color: #6b7280;
                    background: #f8fafc;
                    padding: 1rem 1.5rem;
                    border-radius: 0 0.5rem 0.5rem 0;
                  }
                  .dark .tiptap-editor .ProseMirror blockquote {
                    color: #9ca3af;
                    background: #1f2937;
                    border-left-color: #60a5fa;
                  }
                  
                  /* Code */
                  .tiptap-editor .ProseMirror code {
                    background-color: #f1f5f9;
                    color: #e11d48;
                    padding: 0.2rem 0.4rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    font-weight: 500;
                  }
                  .dark .tiptap-editor .ProseMirror code {
                    background-color: #374151;
                    color: #fbbf24;
                  }
                  
                  /* Code blocks */
                  .tiptap-editor .ProseMirror pre {
                    background-color: #0f172a;
                    color: #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                    overflow-x: auto;
                    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                    line-height: 1.6;
                  }
                  
                  .tiptap-editor .ProseMirror pre code {
                    background: transparent;
                    color: inherit;
                    padding: 0;
                    border-radius: 0;
                    font-size: 0.875rem;
                  }
                  
                  /* Tables */
                  .tiptap-editor .ProseMirror table {
                    border-collapse: collapse;
                    margin: 1.5rem 0;
                    width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    overflow: hidden;
                  }
                  .dark .tiptap-editor .ProseMirror table {
                    border-color: #4b5563;
                  }
                  
                  .tiptap-editor .ProseMirror th,
                  .tiptap-editor .ProseMirror td {
                    border: 1px solid #e5e7eb;
                    padding: 0.75rem 1rem;
                    text-align: left;
                  }
                  .dark .tiptap-editor .ProseMirror th,
                  .dark .tiptap-editor .ProseMirror td {
                    border-color: #4b5563;
                  }
                  
                  .tiptap-editor .ProseMirror th {
                    background-color: #f8fafc;
                    font-weight: 600;
                    color: #374151;
                  }
                  .dark .tiptap-editor .ProseMirror th {
                    background-color: #374151;
                    color: #f9fafb;
                  }
                  
                  .tiptap-editor .ProseMirror td {
                    color: #6b7280;
                  }
                  .dark .tiptap-editor .ProseMirror td {
                    color: #d1d5db;
                  }
                  
                  /* Links */
                  .tiptap-editor .ProseMirror a {
                    color: #3b82f6;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                  }
                  .dark .tiptap-editor .ProseMirror a {
                    color: #60a5fa;
                  }
                  
                  /* Images */
                  .tiptap-editor .ProseMirror img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 0.5rem;
                    margin: 1.5rem 0;
                  }
                  
                  /* Selection */
                  .tiptap-editor .ProseMirror ::selection {
                    background-color: #dbeafe;
                  }
                  .dark .tiptap-editor .ProseMirror ::selection {
                    background-color: #1e3a8a;
                  }
                  
                  /* Placeholder */
                  .tiptap-editor .ProseMirror.ProseMirror-focused .is-empty::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #9ca3af;
                    pointer-events: none;
                    height: 0;
                  }
                `}</style>
              </div>
            </div>
          </div>
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
        onClick={onClose}
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
                  type="text"
                  defaultValue={artifact.name}
                  className="flex-1 px-2 py-1 text-lg font-semibold bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle(e.currentTarget.value);
                    } else if (e.key === "Escape") {
                      handleCancelTitleEdit();
                    }
                  }}
                  onBlur={(e) => handleSaveTitle(e.currentTarget.value)}
                  autoFocus
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-lg font-semibold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
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
              {hasUnsavedChanges && (
                <button
                  onClick={handleSaveContent}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  title="Save changes"
                >
                  Save
                </button>
              )}
              
              <ArtifactActions
                artifact={artifact}
                onArtifactUpdated={onArtifactUpdated}
                onArtifactDeleted={onArtifactDeleted}
                onClose={onClose}
                onEditName={handleEditTitle}
              />
              <button
                onClick={onClose}
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
