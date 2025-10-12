'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Home() {
  const router = useRouter();
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we're in development mode
    const isDev = process.env.NODE_ENV === 'development' ||
                  process.env.NEXT_PUBLIC_ENV === 'DEV';

    setIsDevMode(isDev);

    if (isDev) {
      // Auto-login dev user and redirect
      handleDevAuth();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleDevAuth = async () => {
    try {
      const response = await fetch('/api/dev-auth', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Dev user authenticated:', data.user);

        // Redirect to home page
        router.push('/home');
      } else {
        console.error('Failed to authenticate dev user');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Dev auth error:', error);
      setIsLoading(false);
    }
  };

  // Show loading while auto-authenticating in dev mode
  if (isDevMode && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dev environment...</p>
        </div>
      </div>
    );
  }

  // Production login screen (will be implemented later)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-4">🥬</div>
        <h1 className="text-5xl font-bold mb-2 text-green-800">Sabzzi</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your personal grocery tracker
        </p>

        <div className="space-y-3">
          <Button
            className="w-full h-12 text-lg"
            size="lg"
            onClick={() => alert('Passkey registration - Coming soon!')}
          >
            Register with Passkey
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-lg"
            size="lg"
            onClick={() => alert('Passkey login - Coming soon!')}
          >
            Login with Passkey
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Secure, passwordless authentication
        </p>
      </div>
    </div>
  );
}
