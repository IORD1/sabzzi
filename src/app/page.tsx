'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function Home() {
  const router = useRouter();
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);

  useEffect(() => {
    // Check if we're in development mode
    // Only auto-login if explicitly in development
    const isDev = process.env.NODE_ENV === 'development';

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

  const handleRegisterPasskey = () => {
    // Show PIN dialog
    setShowPinDialog(true);
  };

  const handleStartRegistration = async () => {
    if (!userName.trim() || !pin) {
      alert('Please enter your name and PIN');
      return;
    }

    try {
      setIsLoading(true);
      setShowNameDialog(false);

      // Step 1: Get registration options from server
      const optionsResponse = await fetch(
        '/api/auth/passkey/generate-registration-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, name: userName.trim() }),
        }
      );

      const optionsData = await optionsResponse.json();

      if (!optionsData.success) {
        alert(optionsData.error || 'Failed to generate registration options');
        setIsLoading(false);
        setShowNameDialog(true);
        return;
      }

      // Step 2: Start WebAuthn registration (this shows biometric prompt)
      const credential = await startRegistration(optionsData.options);

      // Step 3: Send credential to server for verification
      const verifyResponse = await fetch(
        '/api/auth/passkey/verify-registration',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempUserId: optionsData.tempUserId,
            name: userName.trim(),
            credential,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        console.log('✅ Registration successful:', verifyData);
        alert(`Welcome ${verifyData.name}! Your account has been created.`);
        setUserName('');
        setPin('');
        router.push('/home');
      } else {
        alert(verifyData.error || 'Failed to verify registration');
        setShowNameDialog(true);
      }
    } catch (error: any) {
      console.error('❌ Error during registration:', error);

      let errorMessage = 'Failed to register passkey. Please try again.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Registration was cancelled or timed out.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Passkeys are not supported on this device/browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error. Make sure you are using HTTPS.';
      }

      alert(errorMessage);
      setShowNameDialog(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPasskey = async () => {
    try {
      setIsLoading(true);

      // Step 1: Get authentication options from server
      const optionsResponse = await fetch(
        '/api/auth/passkey/generate-authentication-options',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const optionsData = await optionsResponse.json();

      if (!optionsData.success) {
        alert(optionsData.error || 'Failed to generate authentication options');
        setIsLoading(false);
        return;
      }

      // Step 2: Start WebAuthn authentication (this shows biometric prompt)
      const credential = await startAuthentication(optionsData.options);

      // Step 3: Send credential to server for verification
      const verifyResponse = await fetch(
        '/api/auth/passkey/verify-authentication',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempUserId: optionsData.tempUserId,
            credential,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.success) {
        console.log('✅ Login successful:', verifyData);
        alert(`Welcome back, ${verifyData.name}!`);
        router.push('/home');
      } else {
        alert(verifyData.error || 'Authentication failed');
      }
    } catch (error: any) {
      console.error('❌ Error during authentication:', error);

      let errorMessage = 'Failed to authenticate. Please try again.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled or timed out.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'No passkey found for this device. Please register first.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Passkeys are not supported on this device/browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Security error. Make sure you are using HTTPS.';
      }

      alert(errorMessage);
    } finally {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 pb-12">
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
            onClick={handleRegisterPasskey}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Register with Passkey'}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-lg"
            size="lg"
            onClick={handleLoginPasskey}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Login with Passkey'}
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Secure authentication using your device's biometrics
        </p>
      </div>

      {/* PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Developer Access</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Enter PIN to register
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">PIN</label>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter developer PIN"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin) {
                    setShowPinDialog(false);
                    setShowNameDialog(true);
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (pin) {
                    setShowPinDialog(false);
                    setShowNameDialog(true);
                  }
                }}
                disabled={!pin}
              >
                Next
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome to Sabzzi!</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Please enter your name to complete registration
            </p>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleStartRegistration();
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowNameDialog(false);
                  setShowPinDialog(false);
                  setUserName('');
                  setPin('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleStartRegistration}
                disabled={!userName.trim() || isLoading}
              >
                {isLoading ? 'Registering...' : 'Register'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
