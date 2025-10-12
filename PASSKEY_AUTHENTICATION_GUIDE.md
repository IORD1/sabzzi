# Passkey Authentication Implementation Guide

## Overview

This app uses **WebAuthn (Passkeys)** for passwordless authentication. Users authenticate using biometrics (Face ID, Touch ID, Windows Hello) or device PIN instead of passwords.

---

## 🔑 Key Concepts

### What is a Passkey?
- Modern replacement for passwords
- Uses device biometrics (fingerprint, face, PIN)
- More secure than traditional passwords
- Tied to specific device (like Face ID on iPhone)
- Uses public-key cryptography

### How it Works
1. **Registration**: Device generates a key pair (public + private)
2. **Storage**: Private key stays on device, public key sent to server
3. **Login**: Device signs a challenge with private key, server verifies with public key

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "mongodb": "^6.20.0",        // Database
    "zustand": "^5.0.8",          // State management
    "next": "15.5.4"              // Framework
  }
}
```

**No additional packages needed!** WebAuthn is native to modern browsers.

---

## 🏗️ Architecture

```
Frontend (AuthScreen.tsx)
    ↓
    ├─ navigator.credentials.create()  → Registration
    ├─ navigator.credentials.get()     → Login
    ↓
Backend API (/api/auth/route.ts)
    ↓
    ├─ POST: Save new user + passkey
    ├─ PUT:  Find user by credentialId
    ↓
MongoDB Database
    ↓
    └─ users collection
        ├─ userId
        ├─ credentialId (passkey identifier)
        ├─ publicKey
        └─ user data
```

---

## 🛡️ Developer PIN Protection

### Why PIN Protection?
Prevents random users from creating accounts in production. Only developers with PIN can register.

### Implementation

**Location**: `src/components/Auth/AuthScreen.tsx:22-27`

```typescript
const registerPasskey = async () => {
  // Ask for PIN verification
  const enteredPin = prompt("Enter developer PIN to register:");

  if (enteredPin !== "4451") {  // ← Change this PIN for your app
    alert("Incorrect PIN. Registration denied.");
    return;
  }

  // Continue with registration...
}
```

### How to Use
1. **Change the PIN**: Replace `"4451"` with your own secret PIN
2. **Share with team**: Give PIN only to authorized users
3. **Remove for open apps**: Delete lines 22-27 if you want public registration

**Alternative Approach**: Move PIN check to backend for better security:
```typescript
// Backend: /api/auth/route.ts
export async function POST(request: Request) {
  const { pin, credentialId, publicKey } = await request.json();

  if (pin !== process.env.DEVELOPER_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
  }

  // Continue with registration...
}
```

---

## 💻 Frontend Implementation

### 1. State Management (`src/hooks/useAuthStore.tsx`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  credential: PublicKeyCredential | null;
  userId: string | null;
  setAuthenticated: (value: boolean) => void;
  setCredential: (credential: PublicKeyCredential | null) => void;
  setUserId: (userId: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      credential: null,
      userId: null,
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setCredential: (credential) => set({ credential }),
      setUserId: (userId) => set({ userId }),
      logout: () => set({
        isAuthenticated: false,
        credential: null,
        userId: null
      }),
    }),
    {
      name: 'auth-storage',  // localStorage key
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId
        // Note: credential is NOT persisted (security)
      }),
    }
  )
);
```

**Key Points:**
- Uses Zustand for global state
- Persists to localStorage (auto-login)
- Does NOT store credential in localStorage (security)
- Stores only `userId` and `isAuthenticated` flag

---

### 2. Registration Flow (`src/components/Auth/AuthScreen.tsx:19-85`)

```typescript
const registerPasskey = async () => {
  try {
    // Step 1: PIN verification
    const enteredPin = prompt("Enter developer PIN to register:");
    if (enteredPin !== "4451") {
      alert("Incorrect PIN. Registration denied.");
      return;
    }

    // Step 2: Generate random user ID
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    // Step 3: Configure WebAuthn options
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge: new Uint8Array(16),  // Random challenge (dummy for now)

      rp: {  // Relying Party (your app)
        name: "Daily Stocks App",
        id: window.location.hostname,  // e.g., "localhost" or "yourapp.com"
      },

      user: {
        id: userId,
        name: "user@example.com",
        displayName: "Daily Stocks User",
      },

      pubKeyCredParams: [{
        alg: -7,  // ES256 algorithm
        type: "public-key"
      }],

      authenticatorSelection: {
        authenticatorAttachment: "platform",  // Use device authenticator (Face ID, etc.)
        userVerification: "required",         // Require biometrics/PIN
      },
    };

    // Step 4: Trigger device authentication
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential;

    if (credential) {
      // Step 5: Extract credential data
      const credentialData = {
        credentialId: Array.from(new Uint8Array(credential.rawId)),
        publicKey: Array.from(
          new Uint8Array((credential.response as any).getPublicKey())
        ),
      };

      // Step 6: Send to backend
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialData),
      });

      const data = await response.json();

      // Step 7: Save to state
      if (data.success && data.userId) {
        setCredential(credential);
        setUserId(data.userId);
        setAuthenticated(true);
        alert(`Welcome! Your account has been created.`);
      }
    }
  } catch (err) {
    console.error("Error registering passkey:", err);
  }
};
```

**What Happens:**
1. User clicks "Register New Passkey"
2. Prompted for developer PIN
3. Device shows biometric prompt (Face ID, fingerprint, etc.)
4. Device generates key pair
5. Public key sent to server
6. User logged in automatically

---

### 3. Login Flow (`src/components/Auth/AuthScreen.tsx:87-121`)

```typescript
const authenticateWithPasskey = async () => {
  try {
    // Step 1: Request authentication from device
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: new Uint8Array(16),  // Random challenge
        userVerification: "required",    // Require biometrics
      },
    }) as PublicKeyCredential;

    if (assertion) {
      // Step 2: Extract credential ID
      const credentialData = {
        credentialId: Array.from(new Uint8Array(assertion.rawId)),
      };

      // Step 3: Send to backend to find user
      const response = await fetch("/api/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentialData),
      });

      const data = await response.json();

      // Step 4: Login success
      if (data.success && data.userId) {
        setCredential(assertion);
        setUserId(data.userId);
        setAuthenticated(true);
      } else {
        alert('User not found. Please register first.');
      }
    }
  } catch (err) {
    console.error("Error authenticating with passkey:", err);
  }
};
```

**What Happens:**
1. User clicks "Login with Passkey"
2. Device shows biometric prompt
3. Device signs challenge with private key
4. CredentialId sent to server
5. Server finds user by credentialId
6. User logged in

---

## 🖥️ Backend Implementation

### Database Schema

**Collection**: `users`

```typescript
{
  userId: "user_1703123456789_abc123def",  // Unique user ID
  credentialId: [123, 45, 67, ...],        // Array of bytes (passkey ID)
  credentialIdString: "123,45,67,...",     // String version for easy lookup
  publicKey: [89, 10, 11, ...],            // Public key bytes
  currentPrice: 10.0,
  createdAt: ISODate("2024-01-01T00:00:00Z"),
  updatedAt: ISODate("2024-01-01T00:00:00Z"),
  lastLoginAt: ISODate("2024-01-01T00:00:00Z"),

  settings: {
    idealWakeTime: "08:00",
    idealSleepTime: "23:00",
    wakeTimeWindow: 30,
    sleepTimeWindow: 30
  },

  activityConfigs: [
    { id: "1", name: "Gym", points: 0.2, icon: "Dumbbell" },
    // ... more activities
  ]
}
```

**Important:**
- `credentialId`: Uniquely identifies the passkey
- `credentialIdString`: Convert array to string for MongoDB queries
- `publicKey`: Used for signature verification (not implemented here, but needed for full security)

---

### API Routes (`src/app/api/auth/route.ts`)

#### POST - Register New User

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    const credentialIdString = credentialIdToString(body.credentialId);

    // Check if passkey already registered
    const existingUser = await db.collection('users').findOne({
      credentialIdString: credentialIdString
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'This passkey is already registered'
      }, { status: 400 });
    }

    // Generate unique user ID
    const userId = generateUserId();  // e.g., "user_1703123456789_abc123def"

    // Create new user document
    const newUser = {
      userId: userId,
      credentialId: body.credentialId,
      credentialIdString: credentialIdString,
      publicKey: body.publicKey,
      currentPrice: 10.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: {
        idealWakeTime: '08:00',
        idealSleepTime: '23:00',
        wakeTimeWindow: 30,
        sleepTimeWindow: 30
      },
      activityConfigs: [
        { id: '1', name: 'Gym', points: 0.2, icon: 'Dumbbell' },
        // ... default activities
      ]
    };

    await db.collection('users').insertOne(newUser);

    return NextResponse.json({
      success: true,
      userId: userId,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Failed to save passkey:', error);
    return NextResponse.json({ error: 'Failed to save passkey' }, { status: 500 });
  }
}
```

#### PUT - Login Existing User

```typescript
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    const credentialIdString = credentialIdToString(body.credentialId);

    // Find user by credentialId
    const user = await db.collection('users').findOne({
      credentialIdString: credentialIdString
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found with this passkey'
      }, { status: 404 });
    }

    // Update last login timestamp
    await db.collection('users').updateOne(
      { userId: user.userId },
      { $set: { lastLoginAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      userId: user.userId,
      currentPrice: user.currentPrice || 10.0
    });
  } catch (error) {
    console.error('Failed to authenticate:', error);
    return NextResponse.json({ error: 'Failed to authenticate' }, { status: 500 });
  }
}
```

#### Helper Functions

```typescript
// Generate unique user ID
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Convert byte array to string for MongoDB lookup
function credentialIdToString(credentialId: number[]): string {
  return credentialId.join(',');
}
```

---

## 🔒 Security Considerations

### Current Implementation (Simplified)
This implementation is **simplified for demonstration**. It skips full cryptographic verification.

**What's Missing:**
1. **Challenge verification**: Should verify signed challenge on backend
2. **Signature verification**: Should verify signature using stored public key
3. **Replay attack prevention**: Should use unique challenges per request
4. **Origin validation**: Should verify request origin

### Production-Ready Security

For production, use a library like `@simplewebauthn/server`:

```typescript
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';

// Registration
export async function POST(request: Request) {
  const { credential, challenge } = await request.json();

  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: process.env.ALLOWED_ORIGIN,
    expectedRPID: process.env.RP_ID,
  });

  if (verification.verified) {
    // Save to database
  }
}
```

### Current Security Features ✓
- Biometric authentication required
- No passwords stored
- Credentials unique per device
- Auto-logout for legacy users
- PIN protection for registration

---

## 🧪 Development Mode

### Bypass Authentication in Development

**Location**: `src/components/Auth/AuthScreen.tsx:123-150`

```typescript
useEffect(() => {
  // Bypass auth in development mode
  if (process.env.NEXT_PUBLIC_ENV === "DEV") {
    const initDevUser = async () => {
      if (!userId) {
        try {
          // Create/fetch persistent dev user
          const response = await fetch('/api/dev-user');
          const data = await response.json();
          if (data.success) {
            setUserId(data.userId);
            setAuthenticated(true);
          }
        } catch (error) {
          // Fallback
          setUserId("user_dev_test");
          setAuthenticated(true);
        }
      }
    };
    initDevUser();
    return;
  }
}, []);
```

### Enable Development Mode

**Create `.env.local`:**
```bash
NEXT_PUBLIC_ENV=DEV
MONGODB_URI=your_mongodb_connection_string
```

**Dev User API** (`src/app/api/dev-user/route.ts`):
```typescript
export async function GET() {
  const DEV_USER_ID = 'user_dev_test';
  const { db } = await connectToDatabase();

  let devUser = await db.collection('users').findOne({ userId: DEV_USER_ID });

  if (!devUser) {
    // Create dev user if doesn't exist
    await db.collection('users').insertOne({
      userId: DEV_USER_ID,
      currentPrice: 10.0,
      settings: { /* defaults */ },
      activityConfigs: [ /* defaults */ ]
    });
    devUser = await db.collection('users').findOne({ userId: DEV_USER_ID });
  }

  return NextResponse.json({ success: true, userId: devUser.userId });
}
```

---

## 📱 Platform Support

### Supported Platforms
- ✅ **iOS/macOS**: Face ID / Touch ID
- ✅ **Android**: Fingerprint / Face unlock
- ✅ **Windows**: Windows Hello
- ✅ **Chrome/Edge/Safari**: All support WebAuthn

### Check Support
```typescript
if (window.PublicKeyCredential) {
  PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    .then((available) => {
      if (available) {
        console.log("Passkeys are supported!");
      }
    });
}
```

---

## 🚀 Implementation Steps for Your App

### Step 1: Install Dependencies
```bash
npm install zustand mongodb
npm install @types/mongodb --save-dev
```

### Step 2: Copy Files
```
src/
├── components/Auth/
│   └── AuthScreen.tsx          ← Copy this
├── hooks/
│   └── useAuthStore.tsx        ← Copy this
├── app/api/
│   ├── auth/route.ts           ← Copy this
│   └── dev-user/route.ts       ← Copy this (optional)
└── utils/
    └── mongodb.ts              ← Setup MongoDB connection
```

### Step 3: Configure MongoDB
```typescript
// src/utils/mongodb.ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
let cachedClient: MongoClient | null = null;

export async function connectToDatabase() {
  if (cachedClient) {
    return { client: cachedClient, db: cachedClient.db("your-app-name") };
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;

  return { client, db: client.db("your-app-name") };
}
```

### Step 4: Wrap Your App
```typescript
// app/page.tsx
import AuthScreen from '@/components/Auth/AuthScreen';

export default function Home() {
  return (
    <AuthScreen>
      {/* Your app content here */}
      <YourAppComponent />
    </AuthScreen>
  );
}
```

### Step 5: Use Authentication State
```typescript
// Any component
import useAuthStore from '@/hooks/useAuthStore';

function MyComponent() {
  const { userId, logout } = useAuthStore();

  // Use userId for API calls
  const loadData = async () => {
    const response = await fetch(`/api/data?userId=${userId}`);
    // ...
  };

  return (
    <div>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Step 6: Protect API Routes
```typescript
// app/api/your-route/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user-specific data
  const data = await db.collection('items').find({ userId }).toArray();
  return NextResponse.json(data);
}
```

---

## 🔧 Customization

### Change Developer PIN
```typescript
// src/components/Auth/AuthScreen.tsx:24
if (enteredPin !== "YOUR_SECRET_PIN") {  // ← Change this
  alert("Incorrect PIN. Registration denied.");
  return;
}
```

### Customize App Name
```typescript
// src/components/Auth/AuthScreen.tsx:37-38
rp: {
  name: "Your App Name",  // ← Change this
  id: window.location.hostname,
},
```

### Change Default User Settings
```typescript
// src/app/api/auth/route.ts:44-60
const newUser = {
  // ... other fields
  settings: {
    // Your custom default settings
    theme: 'light',
    notifications: true,
  },
};
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Platform authenticator not available"
**Cause**: Device doesn't support biometrics or running on HTTP (not HTTPS)
**Solution**:
- Use HTTPS in production
- Enable biometrics on device
- Use `localhost` for development (allowed on HTTP)

### Issue 2: "User not found" after registration
**Cause**: credentialId not matching between registration and login
**Solution**: Ensure `credentialIdToString()` function is consistent

### Issue 3: Login not persisting after refresh
**Cause**: Zustand persist not working
**Solution**: Check localStorage key exists: `auth-storage`

### Issue 4: Multiple registrations creating duplicate users
**Cause**: Same passkey registered twice
**Solution**: Backend checks for existing `credentialIdString` before creating user

---

## 📚 Additional Resources

- **WebAuthn Guide**: https://webauthn.guide/
- **MDN Web Authentication API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API
- **SimpleWebAuthn Library**: https://simplewebauthn.dev/
- **Passkeys.dev**: https://passkeys.dev/

---

## ✅ Checklist for Implementation

- [ ] Copy authentication files to your project
- [ ] Install dependencies (zustand, mongodb)
- [ ] Setup MongoDB connection
- [ ] Configure environment variables
- [ ] Change developer PIN
- [ ] Customize app name and branding
- [ ] Wrap app with `<AuthScreen>`
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test logout functionality
- [ ] Protect API routes with userId checks
- [ ] Setup development mode (optional)
- [ ] Test on multiple devices
- [ ] Consider adding full cryptographic verification for production

---

## 💡 Pro Tips

1. **One Passkey Per Device**: Each device needs its own passkey registration
2. **No Passkey Recovery**: If user loses device, they can't login (by design)
3. **Consider Multi-Factor**: Add email backup for account recovery
4. **Test Cross-Platform**: Passkeys work differently on iOS vs Android vs Desktop
5. **Monitor Browser Support**: Check caniuse.com for WebAuthn support

---

## Summary

This passkey implementation provides:
- ✅ Passwordless authentication
- ✅ Biometric security
- ✅ Multi-user support
- ✅ PIN-protected registration
- ✅ Development mode bypass
- ✅ Persistent sessions
- ✅ Logout functionality

**Security Note**: This is a simplified implementation. For production apps with sensitive data, implement full cryptographic verification using `@simplewebauthn/server`.

---

**Questions?** Check the code comments or refer to the WebAuthn specification.
