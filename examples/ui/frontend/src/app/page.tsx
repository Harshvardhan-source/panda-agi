"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatApp from "@/components/chat-app";
import { getServerURL } from "@/lib/server";
import { storeAuthToken, removeAuthToken } from "@/lib/api/auth";
import { notifyAuthChange } from "@/hooks/useAuth";

// Client Component with authentication routing
export default function Home() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [initialQuery, setInitialQuery] = useState<string | null>(null);

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

  // Always show chat app - login modal will handle authentication when needed
  return <ChatApp isInitializing={isAuthenticating} initialQuery={initialQuery} />;
}
