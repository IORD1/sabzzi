# WebAuthn (Passkey) Setup Guide

This app now uses **@simplewebauthn** - the industry-standard library for WebAuthn implementation.

## What Changed

### Fixed Issues:
✅ **No more double PIN prompt** - PIN only asked once
✅ **Proper challenge-response flow** - Server generates and validates challenges
✅ **Passkeys actually saved** - Credentials properly registered with device
✅ **Reliable authentication** - Works consistently across sessions

### Technical Improvements:
- Server-side verification of registration and authentication
- Proper challenge generation and expiration (5 minutes)
- Counter tracking to prevent replay attacks
- Support for credential backup and transport info
- Better error handling and user feedback

## Environment Variables

### Development (localhost)
Already configured in `.env`:
```
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_ORIGIN=http://localhost:3000
```

### Production (Vercel)
Add these to your Vercel project environment variables:
```
NEXT_PUBLIC_RP_ID=sabzzi.vercel.app
NEXT_PUBLIC_ORIGIN=https://sabzzi.vercel.app
```

**IMPORTANT:** Replace `sabzzi.vercel.app` with your actual Vercel domain!

## How to Set Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these two variables:
   - `NEXT_PUBLIC_RP_ID` = `your-app.vercel.app` (or your custom domain)
   - `NEXT_PUBLIC_ORIGIN` = `https://your-app.vercel.app`
4. Make sure to select **Production**, **Preview**, and **Development** environments
5. Redeploy your app for changes to take effect

## Registration Flow

1. User clicks "Register with Passkey"
2. **PIN Dialog** appears → User enters PIN
3. **Name Dialog** appears → User enters name
4. Click "Register" → Biometric prompt shows
5. User verifies with Face ID/Touch ID/PIN
6. Passkey is saved to device for `sabzzi.vercel.app`
7. User is logged in and redirected to home

## Login Flow

1. User clicks "Login with Passkey"
2. Biometric prompt shows immediately
3. User verifies with Face ID/Touch ID/PIN
4. Device provides saved passkey
5. Server verifies and logs user in

## Testing

### Test Registration:
1. Open app on mobile browser
2. Click "Register with Passkey"
3. Enter PIN: `4452`
4. Enter your name
5. Verify with biometric
6. Should redirect to home page

### Test Login:
1. Close and reopen the app
2. Click "Login with Passkey"
3. Verify with biometric
4. Should log in and redirect to home page

### Verify Passkey Was Saved:
- **iOS**: Settings → Passwords → Search for "sabzzi.vercel.app"
- **Android**: Settings → Passwords & accounts → Saved passwords
- You should see an entry for your app!

## API Endpoints

### Registration:
- `POST /api/auth/passkey/generate-registration-options` - Get challenge
- `POST /api/auth/passkey/verify-registration` - Verify and create user

### Authentication:
- `POST /api/auth/passkey/generate-authentication-options` - Get challenge
- `POST /api/auth/passkey/verify-authentication` - Verify and login

## Database Schema

### Auth Collection:
```javascript
{
  userId: "user_123...",
  name: "User Name",
  credentialId: "base64...",
  credentialIdString: "base64...",  // For lookups
  credentialPublicKey: "base64...",
  counter: 0,                       // Prevents replay attacks
  credentialDeviceType: "public-key",
  credentialBackedUp: false,
  transports: ["internal"],
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

## Troubleshooting

### "No passkey found for this device"
- Passkeys are device-specific
- User needs to register on each device
- Check Settings → Passwords to verify passkey exists

### "Challenge expired or not found"
- Challenges expire after 5 minutes
- User took too long to complete registration/login
- Just try again

### "Registration verification failed"
- RP_ID or ORIGIN mismatch
- Check environment variables match your domain
- Ensure you're using HTTPS in production

### Passkey not appearing in device settings
- Old implementation might have been buggy
- Delete any existing passkeys for your domain
- Re-register with new implementation

## Migration from Old Implementation

Users with passkeys from the old implementation should:
1. Delete old passkeys from device settings
2. Register again with the new implementation
3. New passkeys will work reliably

The old `/api/auth/passkey` endpoint still exists but is not used by the new implementation.

## Security Features

✅ Server-side challenge generation
✅ Challenge expiration (5 minutes)
✅ Counter-based replay attack prevention
✅ Credential backup detection
✅ Transport method tracking
✅ User verification required
✅ Platform authenticator (biometrics)
✅ Origin and RP ID validation

## Next Steps

If you want to remove PIN protection and allow public registration:
1. Remove PIN validation from `/api/auth/passkey/generate-registration-options/route.ts` (lines 8-14)
2. Remove PIN dialog from `/app/page.tsx`
3. Show name dialog directly on "Register" click

For production with sensitive data, consider:
- Email-based account recovery
- Multi-device passkey sync (when supported)
- Security key support as backup
- Audit logging for authentication events
