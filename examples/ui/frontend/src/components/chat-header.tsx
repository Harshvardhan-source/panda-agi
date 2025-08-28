"use client";
import React from "react";
import { Plus, Coins } from "lucide-react";
import UserMenu from "@/components/user-menu";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    <TooltipProvider>
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
                {creditsError ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md bg-destructive/10">
                    <Coins className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive hidden sm:inline">Error</span>
                  </div>
                ) : userCredits ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-all duration-300 cursor-pointer ${
                          creditsLoading ? 'bg-muted/70 scale-[0.98] opacity-80' : ''
                        }`}
                        onClick={onUpgradeClick}
                      >
                        <Coins className={`w-3.5 h-3.5 text-amber-500 transition-all duration-500 ${
                          creditsLoading ? 'animate-spin' : ''
                        }`} />
                        <span className={`text-xs font-medium transition-all duration-300 ${
                          creditsLoading ? 'opacity-60' : ''
                        }`}>
                          {userCredits.credits_left}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Credits - Click to manage plan</p>
                    </TooltipContent>
                  </Tooltip>
                ) : creditsLoading ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md bg-muted/50">
                    <Coins className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
                    <span className="text-xs text-muted-foreground hidden sm:inline">Loading...</span>
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
    </TooltipProvider>
  );
}
