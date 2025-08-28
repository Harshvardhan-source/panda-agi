"use client";
import React from "react";
import { Plus, Coins } from "lucide-react";
import UserMenu from "@/components/user-menu";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { UserCreditsResponse } from "@/lib/api/stripe";
import { PLATFORM_MODE } from "@/lib/config";

interface ChatHeaderProps {
  isInitialLoading: boolean;
  isConnected: boolean;
  sidebarOpen: boolean;
  sidebarWidth: number;
  onNewConversation: () => void;
  onUpgradeClick: () => void;
  onShowLogin?: () => void;
  userCredits: UserCreditsResponse | null;
  creditsLoading: boolean;
  creditsError: string | null;
  onShowLogout?: () => void;
}

export default function ChatHeader({
  isInitialLoading,
  isConnected,
  sidebarOpen,
  sidebarWidth,
  onNewConversation,
  onUpgradeClick,
  onShowLogin,
  userCredits,
  creditsLoading,
  creditsError,
  onShowLogout,
}: ChatHeaderProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div
      className="glass-header p-6 fixed top-0 left-0 right-0 z-10 backdrop-blur-3xl bg-white/60"
      style={{
        width: sidebarOpen ? `calc(100vw - ${sidebarWidth}px)` : "100vw",
      }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar
            showStatus
            status={
              isInitialLoading ? "loading" : isConnected ? "active" : "idle"
            }
          >
            <span className="text-xl select-none">🐼</span>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Annie
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {isConnected ? "Thinking..." : "Ready to help"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Credits Display */}
          {PLATFORM_MODE && isAuthenticated && (
            <>
              {creditsLoading ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                  <Coins className="w-4 h-4 text-gray-400 animate-pulse" />
                  <span className="text-sm text-gray-400">Loading...</span>
                </div>
              ) : creditsError ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <Coins className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-600">Error</span>
                </div>
              ) : userCredits ? (
                <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {userCredits.credits_left} credits
                  </span>
                </div>
              ) : null}
            </>
          )}
          
          {isAuthenticated && (
            <Button onClick={onNewConversation} variant="default" size="action">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </Button>
          )}

          <UserMenu onUpgradeClick={onUpgradeClick} onShowLogin={onShowLogin} onShowLogout={onShowLogout} />
        </div>
      </div>
    </div>
  );
}
