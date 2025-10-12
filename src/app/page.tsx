'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const [pendingCredential, setPendingCredential] = useState<{
    credentialId: number[];
    publicKey: number[];
  } | null>(null);

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

  const handleRegisterPasskey = async () => {
    try {
      setIsLoading(true);

      // Step 1: Ask for PIN
      const pin = prompt('Enter developer PIN to register:');
      if (!pin) {
        setIsLoading(false);
        return;
      }

      // Step 2: Generate random user ID for WebAuthn
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      // Step 3: Create WebAuthn credential
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: new Uint8Array(16), // Random challenge
        rp: {
          name: 'Sabzzi - Grocery Tracker',
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: 'user@sabzzi.app',
          displayName: 'Sabzzi User',
        },
        pubKeyCredParams: [
          {
            alg: -7, // ES256 algorithm
            type: 'public-key',
          },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
        },
        timeout: 60000,
      };

      // Step 4: Trigger biometric authentication
      const credential = (await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      })) as PublicKeyCredential;

      if (credential) {
        // Step 5: Extract credential data
        const credentialId = Array.from(new Uint8Array(credential.rawId));
        const publicKey = Array.from(
          new Uint8Array((credential.response as any).getPublicKey())
        );

        // Step 6: Store temporarily and show name dialog
        setPendingCredential({ credentialId, publicKey });
        setShowNameDialog(true);
      }
    } catch (error) {
      console.error('Error registering passkey:', error);
      alert('Failed to register passkey. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletRegistration = async () => {
    if (!pendingCredential || !userName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      setIsLoading(true);

      // Send registration data to backend
      const response = await fetch('/api/auth/passkey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialId: pendingCredential.credentialId,
          publicKey: pendingCredential.publicKey,
          pin: prompt('Enter developer PIN again to confirm:'),
          name: userName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Registration successful:', data);
        alert(`Welcome ${data.name}! Your account has been created.`);
        setShowNameDialog(false);
        setPendingCredential(null);
        setUserName('');
        router.push('/home');
      } else {
        console.error('❌ Registration failed:', data);
        alert(data.error || 'Failed to register');
      }
    } catch (error) {
      console.error('Error completing registration:', error);
      alert('Failed to complete registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginPasskey = async () => {
    try {
      setIsLoading(true);

      // Step 1: Request authentication from device
      const assertion = (await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(16),
          rpId: window.location.hostname, // Must match registration
          userVerification: 'required',
          timeout: 60000,
        },
      })) as PublicKeyCredential;

      if (assertion) {
        // Step 2: Extract credential ID
        const credentialId = Array.from(new Uint8Array(assertion.rawId));

        // Step 3: Send to backend
        const response = await fetch('/api/auth/passkey', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Login successful:', data);
          alert(`Welcome back, ${data.name}!`);
          router.push('/home');
        } else {
          console.error('❌ Login failed:', data);
          alert(data.error || 'User not found. Please register first.');
        }
      }
    } catch (error: any) {
      console.error('❌ Error authenticating with passkey:', error);

      // Provide more helpful error messages
      let errorMessage = 'Failed to authenticate. Please try again.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled or timed out.';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'No passkey found. Please register first.';
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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-muted"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gradient-to-br from-green-50 to-green-100 px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full h-12 text-lg"
            size="lg"
            onClick={handleDevAuth}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Continue as Guest'}
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Guest mode uses a temporary account for testing
        </p>
      </div>

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
                    handleCompletRegistration();
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
                  setPendingCredential(null);
                  setUserName('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCompletRegistration}
                disabled={!userName.trim() || isLoading}
              >
                {isLoading ? 'Creating...' : 'Complete Registration'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
