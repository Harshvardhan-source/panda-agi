"use client";

import UpgradeModal from "@/components/upgrade-modal";
import Header from "@/components/header";
import LoginModal from "@/components/login-modal";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleClose = () => {
    router.back();
  };

  const handleShowLogin = () => {
    setShowLoginModal(true);
  };

  const handleNewConversation = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Use the main app header */}
      <Header
        isInitialLoading={false}
        isConnected={false}
        sidebarOpen={false}
        sidebarWidth={0}
        onNewConversation={handleNewConversation}
        onUpgradeClick={() => {}} // Already on upgrade page
        onShowLogin={handleShowLogin}
      />

      {/* Main content with top padding for fixed header */}
      <main className="pt-24 pb-16">
        <div className="container max-w-6xl mx-auto px-4">
          <Suspense>
            <UpgradeModal
              isOpen={true}
              onClose={handleClose}
              onShowLogin={handleShowLogin}
              standalone={true}
            />
          </Suspense>
        </div>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
