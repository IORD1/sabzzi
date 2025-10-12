'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics, getHapticPreference, setHapticPreference } from '@/lib/haptics';

export default function SettingsPage() {
  const router = useRouter();
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [userName, setUserName] = useState('Loading...');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    // Load haptics preference
    setHapticsEnabled(getHapticPreference());

    // Load user session
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUserName(data.user.name);
          setUserId(data.user.userId);
        }
      })
      .catch((error) => {
        console.error('Error loading session:', error);
      });
  }, []);

  const handleBack = () => {
    haptics.buttonTap();
    router.push('/home');
  };

  const handleToggleHaptics = () => {
    const newValue = !hapticsEnabled;
    setHapticsEnabled(newValue);
    setHapticPreference(newValue);

    if (newValue) {
      haptics.buttonTap();
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) {
      return;
    }

    haptics.buttonTap();

    try {
      // Call logout API to clear session
      await fetch('/api/auth/logout', { method: 'POST' });

      // Clear any local storage
      localStorage.clear();

      // Redirect to login/landing page
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still redirect even if API call fails
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-12">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 px-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={handleBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* User Profile Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Profile
          </h2>
          <div className="space-y-3 p-4 border rounded-lg bg-card">
            <div>
              <div className="text-xs text-muted-foreground">Name</div>
              <div className="text-sm font-medium">{userName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">User ID</div>
              <div className="text-sm font-mono">{userId}</div>
            </div>
          </div>
        </div>

        {/* App Settings Section */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            App Settings
          </h2>
          <div className="space-y-3">
            {/* Haptic Feedback Toggle */}
            <button
              onClick={handleToggleHaptics}
              className="w-full flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="text-left">
                <div className="text-sm font-medium">Haptic Feedback</div>
                <div className="text-xs text-muted-foreground">
                  Vibration feedback on button taps
                </div>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  hapticsEnabled ? 'bg-green-600' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    hapticsEnabled ? 'translate-x-6' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Account Actions Section */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Account
          </h2>
          <Button
            variant="destructive"
            className="w-full h-12 text-base"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>
      </main>
    </div>
  );
}
