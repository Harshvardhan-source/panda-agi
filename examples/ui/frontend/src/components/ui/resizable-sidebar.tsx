import React, { useState, useEffect, useRef, ReactNode } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResizableSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: {
    text: string;
    href?: string;
  };
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: number;
  onResize?: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const ResizableSidebar: React.FC<ResizableSidebarProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  actions,
  children,
  width,
  onResize,
  minWidth = 400,
  maxWidth = 1050,
  loading = false,
  error = null,
  className,
}) => {
  const [sidebarWidth, setSidebarWidth] = useState(width || 900);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Update internal state when width prop changes
  useEffect(() => {
    if (width && width !== sidebarWidth) {
      setSidebarWidth(width);
    }
  }, [width, sidebarWidth]);

  // Add resize event listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      let newWidth = window.innerWidth - e.clientX;
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setSidebarWidth(newWidth);

      if (onResize) {
        onResize(newWidth);
      }

      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    const handleMouseLeave = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isResizing, minWidth, maxWidth, onResize]);

  const startResizing = () => {
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Apply sidebar open class to body for main content shrinking
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.add("content-shrink");
      }
    } else {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    }

    return () => {
      document.body.classList.remove("sidebar-open");
      const appContainer = document.querySelector("#root > div");
      if (appContainer) {
        appContainer.classList.remove("content-shrink");
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading content...</p>
      </div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-2xl mb-3">⚠️</div>
        <p className="font-medium text-destructive">Error loading content</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "fixed right-0 top-0 h-full bg-background border-l shadow-lg z-50 flex flex-col",
        "transition-all duration-200 ease-out",
        className
      )}
      style={{
        width: `${sidebarWidth}px`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--sidebar-width" as any]: `${sidebarWidth}px`,
      }}
    >
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className={cn(
          "absolute left-0 top-0 w-1 h-full cursor-col-resize z-50",
          "hover:bg-primary/50 transition-colors duration-200"
        )}
        onMouseDown={startResizing}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate flex items-center">
            {icon}
            {title}
          </h3>
          {subtitle && (
            <div className="mt-1">
              {subtitle.href ? (
                <a
                  href={subtitle.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "text-sm text-muted-foreground hover:text-primary",
                    "flex items-center gap-1 transition-colors"
                  )}
                >
                  <span className="truncate">{subtitle.text}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle.text}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={onClose}
            className={cn(
              "h-8 w-8 rounded-md hover:bg-accent transition-colors",
              "flex items-center justify-center cursor-pointer"
            )}
            title="Close preview"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {loading ? renderLoadingState() : error ? renderErrorState() : children}
      </div>
    </div>
  );
};

export default ResizableSidebar;
