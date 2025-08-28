"use client";
import React from "react";
import { Plus } from "lucide-react";
import UserMenu from "@/components/user-menu";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface ChatHeaderProps {
  isInitialLoading: boolean;
  isConnected: boolean;
  sidebarOpen: boolean;
  sidebarWidth: number;
  onNewConversation: () => void;
  onUpgradeClick: () => void;
  onShowLogin?: () => void;
}

export default function ChatHeader({
  isInitialLoading,
  isConnected,
  sidebarOpen,
  sidebarWidth,
  onNewConversation,
  onUpgradeClick,
  onShowLogin,
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
          {isAuthenticated && (
            <Button onClick={onNewConversation} variant="default" size="action">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </Button>
          )}

          <UserMenu onUpgradeClick={onUpgradeClick} onShowLogin={onShowLogin} />
        </div>
      </div>
    </div>
  );
}
