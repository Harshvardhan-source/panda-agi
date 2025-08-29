"use client";

import React from "react";
import LogoutModal from "@/components/logout-modal";
import { useLogout } from "@/hooks/useLogout";

interface PageLayoutProps {
  children: React.ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  const { showLogoutModal, handleLogoutCancel, handleLogoutConfirm } = useLogout();

  return (
    <>
      {children}
      
      {/* Logout Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}

// Export the logout hook for components that need to trigger logout
export { useLogout } from "@/hooks/useLogout";