"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  X,
  FileText,
  Image,
  File,
  Code,
  Archive,
} from "lucide-react";
import EventList from "@/components/event-list";
import MessageCard from "@/components/message-card";
import { Message } from "@/lib/types/event-message";
import { UploadedFile, FileUploadResult } from "@/lib/types/file";
import { getBackendServerURL } from "@/lib/server";
import { getApiHeaders } from "@/lib/api/common";
import { formatAgentMessage } from "@/lib/utils";
import { PreviewData } from "@/components/content-sidebar";

interface RequestBody {
  query: string;
  conversation_id?: string;
}

interface ChatBoxProps {
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
  onPreviewClick: (data: PreviewData) => void;
  onFileClick: (filename: string) => void;
  openUpgradeModal: () => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  sidebarOpen: boolean;
  sidebarWidth: number;
  isInitialLoading?: boolean;
}

export default function ChatBox({
  conversationId,
  setConversationId,
  onPreviewClick,
  onFileClick,
  openUpgradeModal,
  isConnected,
  setIsConnected,
  sidebarOpen,
  sidebarWidth,
  isInitialLoading = false,
}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentMessage, setAgentMessage] = useState<string>(
    "Panda is thinking..."
  );
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-resize textarea based on content
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "24px"; // Reset to minimum height
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Maximum height in pixels
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  };

  // Resize textarea when input value changes
  useEffect(() => {
    resizeTextarea();
  }, [inputValue]);

  // Clear messages when starting a new conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setAgentMessage("Panda is thinking...");
      setInputValue("");
      setPendingFiles([]);
    }
  }, [conversationId]);

  // Handle multiple file uploads
  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setUploadingFiles(true);
      setAgentMessage(formatAgentMessage("file_upload"));

      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);

          if (conversationId) {
            formData.append("conversation_id", conversationId);
          }

          const apiUrl = getBackendServerURL("/files/upload");

          const apiHeaders = await getApiHeaders(false);

          const response = await fetch(apiUrl, {
            method: "POST",
            headers: apiHeaders,
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData?.detail || `HTTP error! status: ${response.status}`
            );
          }

          const result: FileUploadResult = await response.json();
          // Add file to pending files instead of immediately showing as event
          const uploadedFile: UploadedFile = {
            id: Date.now() + Math.random(),
            filename: result.filename,
            original_filename: result.original_filename,
            size: result.size,
            path: result.path,
          };

          if (result.conversation_id) {
            setConversationId(result.conversation_id);
          }

          setPendingFiles((prev) => [...prev, uploadedFile]);
        }
      } catch (error) {
        console.error("Upload error:", error);

        let errorText = "Error: Unable to upload file";

        if (error instanceof Error) {
          errorText = error.message;
          if (errorText === "Failed to fetch") {
            errorText =
              "Server is not responding. Please try again in a few minutes.";
          }
        }
        const errorMessage: Message = {
          id: Date.now(),
          type: "error",
          content: `${errorText}`,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setUploadingFiles(false);
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [
      conversationId,
      setConversationId,
      setMessages,
      setPendingFiles,
      setUploadingFiles,
    ]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Drag and drop event handlers
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      await handleFilesUpload(files);
    }
  };

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (dropZone) {
      dropZone.addEventListener("dragover", handleDragOver);
      dropZone.addEventListener("dragenter", handleDragEnter);
      dropZone.addEventListener("dragleave", handleDragLeave);
      dropZone.addEventListener("drop", handleDrop);
    }

    // Cleanup
    return () => {
      if (dropZone) {
        dropZone.removeEventListener("dragover", handleDragOver);
        dropZone.removeEventListener("dragenter", handleDragEnter);
        dropZone.removeEventListener("dragleave", handleDragLeave);
        dropZone.removeEventListener("drop", handleDrop);
      }
    };
  }, []);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    // Create file references for pending files
    const fileReferences = pendingFiles
      .map((file) => `[./${file.original_filename || file.filename}]`)
      .join(" ");

    // Combine input value with file references
    const messageContent = fileReferences
      ? `${inputValue.trim()} ${fileReferences}`
      : inputValue;

    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message and any pending file upload events
    const newMessages = [userMessage];

    // Add upload events for pending files
    pendingFiles.forEach((file) => {
      const uploadMessage: Message = {
        id: Date.now() + Math.random(),
        type: "event",
        event: {
          data: {
            output_params: {
              filename: file.filename,
              original_filename: file.original_filename,
              size: file.size,
              path: file.path,
            },
            tool_name: "file_upload",
          },
          event_type: "file_upload",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
      newMessages.push(uploadMessage);
    });

    setMessages((prev) => [...prev, ...newMessages]);
    setInputValue("");
    setPendingFiles([]); // Clear pending files
    setIsLoading(true);

    try {
      const apiUrl = getBackendServerURL("/agent/run");

      const requestBody: RequestBody = {
        query: messageContent,
      };

      // Include conversation_id if we have one (for follow-up messages)
      if (conversationId) {
        requestBody.conversation_id = conversationId;
      }

      const apiHeaders = await getApiHeaders();

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.detail ||
            errorData?.error ||
            `HTTP error! status: ${response.status}`
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      setIsConnected(true);

      // Buffer to collect partial event data
      let eventBuffer = "";
      let isCollectingEvent = false;

      if (!reader) {
        throw new Error("Reader is not available");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Process the chunk to find and collect events
        let currentPosition = 0;

        while (currentPosition < chunk.length) {
          // Look for event start if not already collecting
          if (!isCollectingEvent) {
            const startTag = "<event>";
            const startPos = chunk.indexOf(startTag, currentPosition);

            if (startPos !== -1) {
              // Found the start of an event
              isCollectingEvent = true;
              currentPosition = startPos + startTag.length;
              eventBuffer = ""; // Reset buffer for new event
            } else {
              // No event start found in this chunk
              break;
            }
          } else {
            // Already collecting an event, look for the end tag
            const endTag = "</event>";
            const endPos = chunk.indexOf(endTag, currentPosition);

            if (endPos !== -1) {
              // Found the end of the event
              eventBuffer += chunk.substring(currentPosition, endPos);
              currentPosition = endPos + endTag.length;
              isCollectingEvent = false;

              // Process the complete event
              try {
                const eventData = JSON.parse(eventBuffer);

                // Validate that eventData has the expected structure
                if (eventData && typeof eventData === "object") {
                  // Handle conversation_started event
                  if (
                    eventData.data &&
                    eventData.data.type === "conversation_started" &&
                    eventData.data.payload &&
                    eventData.data.payload.conversation_id
                  ) {
                    setConversationId(eventData.data.payload.conversation_id);
                    continue; // Don't add this as a visible message
                  }

                  // Check for any errors in user_notification or error events
                  if (
                    (eventData.data &&
                      eventData.data.type === "user_notification" &&
                      eventData.data.payload &&
                      eventData.data.payload.error) ||
                    (eventData.data && eventData.data.type === "error")
                  ) {
                    // Set loading to false for any error event
                    setIsLoading(false);
                  }

                  // Check if tool calling is to start
                  if (eventData.data && eventData.event_type === "tool_start") {
                    setAgentMessage(
                      formatAgentMessage(eventData.data.tool_name)
                    );
                    continue;
                  }

                  // Check if tool call has ended
                  if (eventData.data && eventData.event_type === "tool_end") {
                    setAgentMessage("Panda is thinking...");
                  }

                  const message: Message = {
                    id: Date.now() + Math.random(),
                    type: "event",
                    event: eventData,
                    timestamp: new Date().toISOString(),
                  };

                  setMessages((prev) => [...prev, message]);
                } else {
                  console.warn("Received malformed event data:", eventData);
                }
              } catch (e) {
                console.error(
                  "Error parsing event data:",
                  e,
                  "Data:",
                  eventBuffer
                );
              }
            } else {
              // Event continues beyond this chunk
              eventBuffer += chunk.substring(currentPosition);
              break;
            }
          }
        }
      }
    } catch (error) {
      let errorText: string = "Unable to process request, try again!";

      if (error instanceof Error) {
        errorText = error.message;
        if (errorText === "Failed to fetch") {
          errorText = "Server is not responding, try again later";
        }
      }
      const errorMessage: Message = {
        id: Date.now(),
        type: "error",
        content: `Error: ${errorText}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsConnected(false);
    }
  };

  // Trigger file input click
  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFilesUpload(Array.from(files));
    }
  };

  const removePendingFile = (fileId: number) => {
    setPendingFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  // ...
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    const iconClass = "w-4 h-4";

    if (!extension) {
      return <File className={`${iconClass} text-gray-500`} />;
    }

    if (
      ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension)
    ) {
      return (
        <Image className={`${iconClass} text-green-500`} aria-hidden="true" />
      );
    }
    if (
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
        "html",
        "htm",
      ].includes(extension)
    ) {
      return <Code className={`${iconClass} text-blue-500`} />;
    }
    if (["md", "txt", "doc", "docx", "pdf"].includes(extension)) {
      return <FileText className={`${iconClass} text-orange-500`} />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
      return <Archive className={`${iconClass} text-purple-500`} />;
    }
    return <File className={`${iconClass} text-gray-500`} />;
  };

  return (
    <div
      className="relative transition-all duration-300 w-full bg-gradient-to-br from-slate-50/90 via-white/60 to-slate-100/80 overflow-hidden"
      style={{
        width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
        height: "100vh",
      }}
    >
      {/* Unique Annie Pattern Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle design elements */}
        <div className="absolute top-20 left-[8%] w-0.5 h-8 bg-slate-300/20 rounded-full rotate-12"></div>
        <div className="absolute top-40 right-[12%] w-0.5 h-6 bg-slate-300/25 rounded-full -rotate-12"></div>
        <div className="absolute bottom-32 left-[15%] w-0.5 h-10 bg-slate-300/20 rounded-full rotate-45"></div>
        <div className="absolute bottom-48 right-[20%] w-0.5 h-4 bg-slate-300/30 rounded-full -rotate-45"></div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              radial-gradient(circle at 2px 2px, #1e293b 1px, transparent 0)
            `,
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>
      {/* Messages - full height with top padding for header */}
      <div
        ref={dropZoneRef}
        className={`absolute inset-0 overflow-y-auto scrollbar-hide ${
          isDragging
            ? "bg-blue-50/50 border-2 border-dashed border-blue-300 rounded-lg"
            : ""
        }`}
        style={{
          paddingTop: "140px",
          paddingBottom: "140px",
          paddingLeft: "1rem",
          paddingRight: "1rem",
        }}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-xl z-10">
            <div className="text-center p-8 rounded-2xl bg-white/90 shadow-2xl border border-slate-200/50 backdrop-blur-sm">
              <Paperclip className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Drop files here
              </h3>
              <p className="text-sm text-slate-600">
                Release to upload your files
              </p>
            </div>
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[65vh] px-4">
              {/* Clean Welcome */}
              <div className="text-center mb-16">
                <h3 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                  {(() => {
                    const hour = new Date().getHours();
                    const greeting =
                      hour < 12
                        ? "Morning"
                        : hour < 18
                        ? "Afternoon"
                        : "Evening";
                    return `${greeting} 👋`;
                  })()}
                </h3>
                <p className="text-slate-500 text-lg font-light mb-10">
                  What do you want to see?
                </p>

                {/* Clean Dashboard Options */}
                <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                  {[
                    {
                      title: "Sales",
                      prompt:
                        "Show me sales performance this month vs last month with revenue trends and top deals",
                    },
                    {
                      title: "Marketing",
                      prompt:
                        "Create a marketing dashboard showing campaign ROI, ad spend, and conversion rates",
                    },
                    {
                      title: "Team",
                      prompt:
                        "Build a team dashboard tracking productivity, goal completion, and performance metrics",
                    },
                    {
                      title: "Finance",
                      prompt:
                        "Show me financial overview with cash flow, monthly expenses, and profit margins",
                    },
                    {
                      title: "Customers",
                      prompt:
                        "Create customer analytics showing acquisition trends, retention rates, and lifetime value",
                    },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(item.prompt)}
                      className="px-4 py-2 bg-white/60 hover:bg-white/90 border border-slate-200/60 hover:border-slate-300/80 rounded-xl text-center transition-all duration-200 hover:shadow-sm text-sm font-medium text-slate-700 hover:text-slate-900"
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((message: Message) => (
            <div key={message.id} className="animate-slide-up">
              {(message.type === "user" || message.type === "error") && (
                <MessageCard message={message} />
              )}

              {message.type === "event" && (
                <EventList
                  message={message}
                  conversationId={conversationId}
                  onPreviewClick={onPreviewClick}
                  onFileClick={onFileClick}
                  openUpgradeModal={openUpgradeModal}
                />
              )}
            </div>
          ))}

          {(isLoading || uploadingFiles) && (
            <div className="flex justify-start mb-2">
              <div className="flex items-center space-x-3 px-4 py-2 bg-white/90 rounded-2xl">
                <div className="text-base">🐼</div>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:0.3s]"></div>
                  <div className="w-1 h-1 bg-slate-400 rounded-full animate-pulse [animation-delay:0.6s]"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - positioned absolutely at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 p-8"
        style={{
          width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/98 backdrop-blur-3xl border border-slate-200/40 rounded-[2rem] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/2 relative overflow-hidden transition-all duration-500 hover:shadow-[0_25px_50px_rgba(0,0,0,0.12)]">
            {/* Subtle activity indicator */}
            {(isLoading || uploadingFiles) && (
              <div className="absolute top-0 left-0 right-0 h-0.5">
                <div className="h-full bg-gradient-to-r from-blue-500/30 via-purple-500/50 to-emerald-500/30 animate-pulse"></div>
              </div>
            )}
            {/* Pending Files Display - Integrated inside input container */}
            {pendingFiles.length > 0 && (
              <div className="mb-4 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700 flex items-center">
                    <Paperclip className="w-4 h-4 mr-2" />
                    {pendingFiles.length} attachment
                    {pendingFiles.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setPendingFiles([])}
                    className="text-sm text-slate-500 hover:text-red-600 transition-colors flex items-center font-medium"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((file) => (
                    <div
                      key={file.id}
                      className="group flex items-center space-x-2 bg-white/90 backdrop-blur-sm border border-slate-200/50 rounded-xl px-3 py-2 text-sm hover:bg-white transition-all duration-200 hover:shadow-md"
                    >
                      {getFileIcon(file.filename)}
                      <div className="flex flex-col min-w-0">
                        <span className="text-slate-800 font-semibold truncate max-w-[140px]">
                          {file.filename}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        onClick={() => removePendingFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all duration-200 p-1 rounded-lg hover:bg-red-50"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-5">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="*/*"
              />

              {/* Upload button */}
              <button
                onClick={handleFileUpload}
                disabled={uploadingFiles || isInitialLoading}
                className="p-3.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-2xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                title={uploadingFiles ? "Uploading..." : "Upload files"}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                <Paperclip className="w-5 h-5 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 relative z-10" />
              </button>

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    // Trigger resize on next frame to ensure content is updated
                    setTimeout(resizeTextarea, 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={
                    isInitialLoading
                      ? "Annie is waking up..."
                      : "What would you like to see?"
                  }
                  className="w-full bg-transparent text-slate-900 placeholder-slate-500/70 resize-none border-none outline-none text-base leading-relaxed font-medium py-1 selection:bg-blue-100/50"
                  rows={1}
                  disabled={isLoading || isInitialLoading}
                  style={{ minHeight: "32px", maxHeight: "120px" }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || isInitialLoading}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-2xl transition-all duration-300 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl transform hover:scale-[1.03] active:scale-[0.97] group relative overflow-hidden"
                title="Send message"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Send className="w-5 h-5 group-hover:translate-x-0.5 transition-transform duration-300 relative z-10" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
