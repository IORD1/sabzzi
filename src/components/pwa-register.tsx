'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration);

          // Check for updates on load
          registration.update();

          // Check for updates every 60 seconds
          const updateInterval = setInterval(() => {
            console.log('[App] Checking for service worker updates...');
            registration.update();
          }, 60000); // 60 seconds

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[App] New service worker found, installing...');

            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('[App] Service worker state:', newWorker.state);

                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker is installed and ready
                  // The UpdateNotification component will handle the UI
                  console.log('[App] New service worker installed and waiting');
                }
              });
            }
          });

          // Clean up interval on unmount
          return () => {
            clearInterval(updateInterval);
          };
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error);
        });

      // Listen for controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] Service worker controller changed, reloading...');
        // This will be triggered when skipWaiting() is called
        // The UpdateNotification component handles the reload
      });
    }
  }, []);

  return null;
}
