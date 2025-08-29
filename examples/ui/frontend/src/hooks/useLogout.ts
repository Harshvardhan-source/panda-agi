"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api/auth";
import { notifyAuthChange } from "./useAuth";

// Global state for logout modal
let globalShowLogoutModal = false;
const globalSetters: Set<(show: boolean) => void> = new Set();

function setGlobalLogoutModal(show: boolean) {
  globalShowLogoutModal = show;
  globalSetters.forEach(setter => setter(show));
}

export function useLogout() {
  const [showLogoutModal, setShowLogoutModal] = useState(globalShowLogoutModal);
  const router = useRouter();

  useEffect(() => {
    // Register this component's setter
    globalSetters.add(setShowLogoutModal);
    
    // Cleanup
    return () => {
      globalSetters.delete(setShowLogoutModal);
    };
  }, []);

  const handleShowLogout = useCallback(() => {
    setGlobalLogoutModal(true);
  }, []);

  const handleLogoutCancel = useCallback(() => {
    setGlobalLogoutModal(false);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    logout();
    // Notify all components about auth change
    notifyAuthChange();
    setGlobalLogoutModal(false);
    // Redirect to home page after logout
    router.push("/");
  }, [router]);

  return {
    showLogoutModal,
    handleShowLogout,
    handleLogoutCancel,
    handleLogoutConfirm,
  };
}