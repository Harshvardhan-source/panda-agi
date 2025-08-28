import React, { useState, useEffect } from "react";
import { LogOut, Crown, Menu, CreditCard, LogIn } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { logout, isAuthRequired } from "@/lib/api/auth";
import { createCustomerPortal, getUserSubscription } from "@/lib/api/stripe";
import { PLATFORM_MODE, EXTERNAL_URLS } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";

interface UserMenuProps {
  onUpgradeClick: () => void;
  onShowLogin?: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onUpgradeClick, onShowLogin }) => {
  const [hasInvoices, setHasInvoices] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkInvoicesAvailability = async () => {
      // Only check subscription if authenticated and in platform mode
      if (PLATFORM_MODE && isAuthenticated) {
        try {
          const subscription = await getUserSubscription();
          setHasInvoices(subscription.has_subscription);
        } catch (error) {
          console.error("Failed to check subscription:", error);
          setHasInvoices(false);
          // Only show toast if user is authenticated (avoid showing errors for unauthenticated users)
          if (isAuthenticated) {
            toast.error("Failed to check subscription status");
          }
        }
      } else {
        setHasInvoices(false);
      }
    };

    checkInvoicesAvailability();
  }, [isAuthenticated]); // Re-run when authentication status changes

  const handleUpgradeClick = () => {
    if (PLATFORM_MODE) {
      // In platform mode, open the upgrade modal
      onUpgradeClick();
    } else {
      // In non-platform mode, redirect to external upgrade page
      window.open(EXTERNAL_URLS.UPGRADE, "_blank");
    }
  };

  const handleInvoicesClick = async () => {
    try {
      // Get the actual portal URL
      const portalResponse = await createCustomerPortal({
        return_url: window.location.href,
      });

      window.open(portalResponse.url, "_blank");
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open billing portal. Please try again later.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center justify-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {!isAuthenticated && isAuthRequired() ? (
          // Show only login option when not authenticated
          <DropdownMenuItem onClick={onShowLogin}>
            <LogIn className="w-4 h-4 mr-2" />
            <span>Login</span>
          </DropdownMenuItem>
        ) : (
          <>
            {/* Manage Plan option - show when authenticated or auth not required */}
            <DropdownMenuItem onClick={handleUpgradeClick}>
              <Crown className="w-4 h-4 mr-2" />
              <span>Manage Plan</span>
            </DropdownMenuItem>

            {/* Platform mode specific options */}
            {PLATFORM_MODE && isAuthenticated && (
              <>
                {/* Invoices and Billing - only show if user has subscription */}
                {hasInvoices && (
                  <DropdownMenuItem onClick={handleInvoicesClick}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    <span>Invoices & Billing</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
