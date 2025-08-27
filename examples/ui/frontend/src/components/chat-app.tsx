"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import ContentSidebar, { PreviewData } from "@/components/content-sidebar";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import UpgradeModal from "@/components/upgrade-modal";
import UserMenu from "@/components/user-menu";
import { useSearchParams } from "next/navigation";
import ChatBox from "@/components/chatbox";
import { getFileType } from "@/lib/utils";

interface ChatAppProps {
  isInitializing?: boolean;
}

function ChatApp({ isInitializing = false }: ChatAppProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticating, setIsAuthenticating] = useState(!isInitializing);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(900); // Default sidebar width (match initial in ContentSidebar)
  const [previewData, setPreviewData] = useState<PreviewData>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Handle URL parameters for upgrade modal
  useEffect(() => {
    const upgradeParam = searchParams.get("upgrade");
    if (upgradeParam === "open") {
      setShowUpgradeModal(true);
    }
  }, [searchParams]);

  const handlePreviewClick = (data: PreviewData) => {
    setPreviewData(data);
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setPreviewData(undefined);
  };

  // Function to open file in sidebar - content fetching is handled by ContentSidebar
  const handleFileClick = (filename: string) => {
    const fileType = getFileType(filename);

    setPreviewData({
      filename: filename,
      title: `File: ${filename.split("/").pop()}`,
      type: fileType,
    });
    setSidebarOpen(true);
  };

  const startNewConversation = () => {
    setConversationId(undefined);
    setSidebarOpen(false);
    setPreviewData(undefined);
  };

  // Authentication check - placed after all hooks to follow Rules of Hooks
  useEffect(() => {
    // If we're initializing from parent, wait for parent to finish
    if (isInitializing) {
      return;
    }

    // Check if authentication is required
    if (isAuthRequired()) {
      // Check if user is authenticated
      const token = getAccessToken();

      if (!token) {
        // User is not authenticated, redirect to login
        router.push("/login");
        return;
      }
    }

    // User is authenticated or auth is not required
    setIsAuthenticating(false);
  }, [router, isInitializing]);

  // Update authentication state when parent finishes initializing
  useEffect(() => {
    if (!isInitializing && isAuthenticating) {
      setIsAuthenticating(false);
    }
  }, [isInitializing, isAuthenticating]);

  // Listen for messages from iframe content to open URLs in sidebar
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OPEN_IN_SIDEBAR") {
        const { url, title } = event.data;
        setPreviewData({
          url: url,
          content: "",
          title: title || `External: ${url}`,
          type: "iframe",
        });
        setSidebarOpen(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Calculate if we should show loading state
  const isInitialLoading = isAuthenticating || isInitializing;

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div
        className="flex flex-col transition-all duration-300 w-full"
        style={{
          width: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : "100%",
        }}
      >
        {/* Header - positioned absolutely over content */}
        <div
          className="glass-header p-6 fixed top-0 left-0 right-0 z-10 backdrop-blur-3xl bg-white/60"
          style={{
            width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
          }}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-xl select-none">🐼</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                  {isInitialLoading ? (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  ) : isConnected ? (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  ) : (
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Annie
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {isInitialLoading
                    ? "Initializing..."
                    : isConnected
                    ? "Thinking..."
                    : "Ready to help"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* New Conversation Button */}
              <button
                onClick={startNewConversation}
                className="flex items-center space-x-2 px-5 py-2.5 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              {/* User Menu Dropdown */}
              <UserMenu onUpgradeClick={() => setShowUpgradeModal(true)} />
            </div>
          </div>
        </div>

        {/* ChatBox Component */}
        <ChatBox
          conversationId={conversationId}
          setConversationId={setConversationId}
          onPreviewClick={handlePreviewClick}
          onFileClick={handleFileClick}
          openUpgradeModal={() => setShowUpgradeModal(true)}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
          isInitialLoading={isInitialLoading}
        />
      </div>

      {/* Sidebar */}
      <ContentSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        previewData={previewData}
        conversationId={conversationId}
        width={sidebarWidth}
        onResize={setSidebarWidth}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}

export default function ChatAppWithSuspense({ isInitializing = false }: ChatAppProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 relative mb-4 mx-auto">
              <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
                🐼
              </span>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
            <p className="text-muted-foreground">Loading chat interface</p>
          </div>
        </div>
      }
    >
      <ChatApp isInitializing={isInitializing} />
    </Suspense>
  );
}