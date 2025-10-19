'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Only run in browser with service worker support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Listen for messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('[App] New version available:', event.data.version);
        setNewVersion(event.data.version);
        setShowUpdate(true);
      }

      if (event.data && event.data.type === 'UPDATE_ACTIVATED') {
        console.log('[App] New version activated:', event.data.version);
        // Reload the page to use the new version
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check if there's already a waiting service worker
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        console.log('[App] Service worker already waiting');
        setShowUpdate(true);
      }
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    setIsUpdating(true);

    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.waiting) {
          // Send SKIP_WAITING message to the waiting service worker
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((error) => {
        console.error('[App] Error updating service worker:', error);
        setIsUpdating(false);
      });
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-lg bg-green-600 text-white shadow-lg border border-green-700">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">New version available</p>
                <p className="text-xs text-green-100 mt-0.5">
                  Update now to get the latest features
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                disabled={isUpdating}
                className="text-white hover:bg-green-700 hover:text-white h-8"
              >
                Later
              </Button>
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="bg-white text-green-700 hover:bg-green-50 h-8 font-semibold"
              >
                {isUpdating ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update Now'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
