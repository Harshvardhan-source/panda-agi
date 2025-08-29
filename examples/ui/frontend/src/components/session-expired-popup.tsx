"use client";

import { useRouter } from "next/navigation";

interface SessionExpiredPopupProps {
  isOpen: boolean;
}

export default function SessionExpiredPopup({ isOpen }: SessionExpiredPopupProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleStartNewChat = () => {
    // Reload the page to start a fresh chat
    window.location.reload();
  };

  const handleGoToCreations = () => {
    // Navigate to the creations page
    router.push("/creations");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="relative px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 mb-3 relative">
              <span className="text-4xl select-none absolute inset-0 flex items-center justify-center">
                ⏰
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Your chat is expired
            </h2>
            <p className="text-gray-600 text-center mt-2">
              Due to inactivity, your current chat session has expired
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-3">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Start a new chat
          </button>

          <button
            onClick={handleGoToCreations}
            className="w-full flex items-center justify-center px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Go to my creations
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
} 