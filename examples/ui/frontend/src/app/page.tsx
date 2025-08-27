"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, isAuthRequired } from "@/lib/api/auth";
import ChatApp from "./chat/page";

// Client Component with authentication routing
export default function Home() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [shouldShowLogin, setShouldShowLogin] = useState(false);

  useEffect(() => {
    // Check if authentication is required
    if (!isAuthRequired()) {
      // If auth is not required, show chat immediately
      setIsAuthenticating(false);
      return;
    }

    // Check if user is already authenticated
    const token = getAccessToken();
    
    if (token) {
      // User is authenticated, show chat
      setIsAuthenticating(false);
    } else {
      // User is not authenticated, redirect to login
      setShouldShowLogin(true);
      router.push("/login");
    }
  }, [router]);

  // If we need to redirect to login, don't render anything
  if (shouldShowLogin) {
    return null;
  }

  // Show chat app immediately with loading state
  return <ChatApp isInitializing={isAuthenticating} />;
}
