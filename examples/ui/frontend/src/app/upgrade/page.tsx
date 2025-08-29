"use client";

import UpgradeModal from "@/components/upgrade-modal";
import Header from "@/components/header";
import LoginModal from "@/components/login-modal";
import PageLayout, { useLogout } from "@/components/page-layout";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";

export default function UpgradePage() {
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Use the reusable logout hook
  const { handleShowLogout } = useLogout();

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
    <PageLayout>
      <div className="min-h-screen bg-background">
        <Header
          onUpgradeClick={() => setShowUpgradeModal(true)}
          onShowLogin={handleShowLogin}
          onShowLogout={handleShowLogout}
          onNewConversation={handleNewConversation}
          title="Upgrade"
          subtitle="Choose your plan"
          variant="page"
        />

        <div className="pt-32 px-6">
          <div className="max-w-4xl mx-auto">
            <Suspense>
              <UpgradeModal
                isOpen={true}
                onClose={handleClose}
                onShowLogin={handleShowLogin}
                standalone={true}
              />
            </Suspense>
          </div>
        </div>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </div>
    </PageLayout>
  );
}
