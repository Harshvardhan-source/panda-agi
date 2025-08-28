"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ContentSidebar, { PreviewData } from "@/components/content-sidebar";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import UpgradeModal from "@/components/upgrade-modal";
import { useSearchParams } from "next/navigation";
import ChatBox from "@/components/chatbox";
import ChatHeader from "@/components/chat-header";
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
        <ChatHeader
          isInitialLoading={isInitialLoading}
          isConnected={isConnected}
          sidebarOpen={sidebarOpen}
          sidebarWidth={sidebarWidth}
          onNewConversation={startNewConversation}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

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

export default function ChatAppWithSuspense({
  isInitializing = false,
}: ChatAppProps) {
  return <ChatApp isInitializing={isInitializing} />;
}
