"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import ContentSidebar, { PreviewData } from "@/components/content-sidebar";
import UpgradeModal from "@/components/upgrade-modal";
import ChatBox from "@/components/chatbox";
import Header, { HeaderRef } from "@/components/header";
import LoginModal from "@/components/login-modal";
import SessionExpiredPopup from "@/components/session-expired-popup";
import PageLayout, { useLogout } from "@/components/page-layout";
import { getFileType } from "@/lib/utils";
import { useInactivityTimer } from "@/hooks/useInactivityTimer";
import { getServerURL } from "@/lib/server";
import { storeAuthToken, removeAuthToken } from "@/lib/api/auth";
import { notifyAuthChange } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const headerRef = useRef<HeaderRef>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(900); // Default sidebar width (match initial in ContentSidebar)
  const [previewData, setPreviewData] = useState<PreviewData>();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Use the reusable logout hook
  const { handleShowLogout } = useLogout();

  // Use the inactivity timer hook
  const { showInactivityPopup, setShowInactivityPopup, trackUserMessage } = useInactivityTimer();

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

  useEffect(() => {
    // Extract query parameter directly from window.location
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('query');
      if (query) {
        setInitialQuery(decodeURIComponent(query));
      }
    }

    const handleAuthentication = async () => {
      try {
        // Check if we have a hash fragment (OAuth callback)
        const hash = window.location.hash.substring(1);

        if (hash) {
          // Parse the hash fragment into key-value pairs
          const params = hash
            .split("&")
            .reduce<Record<string, string>>((result, item) => {
              const [key, value] = item.split("=");
              result[key] = decodeURIComponent(value);
              return result;
            }, {});

          // Check if we have an access token
          if (params.access_token) {
            // Create an auth object with all parameters
            const authData = {
              access_token: params.access_token,
              expires_at: params.expires_at || null,
              expires_in: params.expires_in || null,
              refresh_token: params.refresh_token || null,
              token_type: params.token_type || null,
              provider_token: params.provider_token || null,
            };

            // Clear the hash from URL
            window.history.replaceState({}, document.title, "/");

            // Validate the token with our backend
            try {
              const response = await fetch(
                `${getServerURL()}/public/auth/validate`,
                {
                  headers: {
                    Authorization: `Bearer ${params.access_token}`,
                  },
                  credentials: "include",
                }
              );

              if (response.ok) {
                const userData = await response.json();

                // Store token in localStorage
                storeAuthToken(authData);

                // Store any user data if needed
                if (userData.user && typeof window !== "undefined") {
                  localStorage.setItem(
                    "user_data",
                    JSON.stringify(userData.user)
                  );
                }

                // Notify all components about the auth change
                notifyAuthChange();
              } else {
                console.error("Token validation failed");
                removeAuthToken();
              }
            } catch (validationError) {
              console.error("Token validation error:", validationError);
              removeAuthToken();
            }
          }
        }
      } catch (error) {
        console.error("Error during authentication:", error);
      } finally {
        // Always show chat regardless of authentication status
        setIsAuthenticating(false);
      }
    };

    handleAuthentication();
  }, [router]);

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
  const isInitialLoading = isAuthenticating;

  return (
    <PageLayout>
      <div className="flex h-screen">
        {/* Main content */}
        <div
          className="flex flex-col transition-all duration-300 w-full"
          style={{
            width: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : "100%",
          }}
        >
          <Header
            ref={headerRef}
            isInitialLoading={isInitialLoading}
            isConnected={isConnected}
            sidebarOpen={sidebarOpen}
            sidebarWidth={sidebarWidth}
            onNewConversation={startNewConversation}
            onUpgradeClick={() => setShowUpgradeModal(true)}
            onShowLogin={() => setShowLoginModal(true)}
            onShowLogout={handleShowLogout}
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
            initialQuery={initialQuery}
            onCreditsRefetch={async () => {
              headerRef.current?.refreshCredits();
            }}
            onUserMessage={trackUserMessage}
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
        <Suspense fallback={null}>
          <UpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onShowLogin={() => {
              setShowUpgradeModal(false);
              setShowLoginModal(true);
            }}
          />
        </Suspense>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />

        {/* Session Expired Popup */}
        <SessionExpiredPopup isOpen={showInactivityPopup} />
      </div>
    </PageLayout>
  );
}
