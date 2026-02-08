import React from 'react';

export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = React.useState(false);
  const [offlineReady, setOfflineReady] = React.useState(false);

  React.useEffect(() => {
    // PWA registration is optional - silently skip if not available
    // The vite-plugin-pwa provides this virtual module when configured
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Check if we have a waiting service worker
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          setNeedRefresh(true);
        }
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setNeedRefresh(true);
              }
            });
          }
        });
      }).catch(() => {
        // No service worker, that's fine
      });
    }
  }, []);

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-16 right-4 z-50 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-100 p-3 shadow-xl">
      {offlineReady && <div>✨ Offline ready</div>}
      {needRefresh && (
        <div className="flex gap-2 items-center">
          <span>New version available</span>
          <button 
            className="px-3 py-1 bg-emerald-600 rounded text-white hover:bg-emerald-500"
            onClick={() => location.reload()}
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
