# Design Document

## Overview

**Sabzzi** (vegetables in Hindi) is a personal grocery tracker web application designed for mobile-first usage. The app helps track grocery purchases and logs, with two distinct user roles: Buyer and Logger. Any user can act as either a Buyer or Logger depending on their activity.

## Architecture

- **Frontend**: Next.js web application with Shadcn UI library
- **Database**: MongoDB for data persistence
- **Deployment Model**: Progressive Web App (PWA) - users will install via Chrome's "Add to Home Screen" feature
- **Platform**: Mobile-first responsive web app

## Key Components

### User Roles
1. **Buyer**: Users who purchase groceries
2. **Logger**: Users who log/record grocery items

Note: Any user can perform both roles - the role is activity-based, not permission-based.

### Core Screens
- Login Screen (entry point)
  - Register Passkey button
  - Login with Passkey button
- Home Screen (after authentication)
  - Two main tabs/sections:
    - **My Lists**: Lists created by the user
    - **To Buy**: Lists shared with the user by others
  - Settings icon in header
- My Lists Screen
  - Display all lists created by user
  - Actions: Create New List, Duplicate List, Edit List
- To Buy Screen
  - Display all lists shared with the user
  - Shows as todo-style checklist
  - Mark items as bought
- Create/Edit List Screen
  - Auto-generated list name based on date (e.g., "12 OCT LIST", "12 OCT LIST#2")
  - Optional: Set list emoji/icon
  - Add items: search existing OR create new custom items
  - Bilingual support: Add Hindi/Marathi names for items
  - Set quantity for each item (weight/money/count)
  - Save list
  - Share list with other users
- List Detail Screen
  - View all items in list with bilingual names
  - Mark items as bought (buyer role)
  - Edit/remove items (logger role)
  - Share button to share with other users
  - Comments section for collaboration
- Settings Screen
  - User profile information
  - Haptic feedback toggle
  - Logout button

### Authentication Flow

**Registration Flow:**
1. User clicks "Register Passkey"
2. System prompts for dev pin (validation pin: 4452)
3. After valid pin, initiate passkey registration (WebAuthn)
4. After successful passkey creation, ask for user's name
5. Generate and assign userId
6. Store user data in MongoDB

**Login Flow:**
1. User clicks "Login with Passkey"
2. System initiates passkey authentication (WebAuthn)
3. On success, redirect to Home screen (default: My Lists tab)

### User Experience Flow

**Creating a New List:**
1. User logs in and lands on Home screen with "My Lists" tab active
2. User sees all past lists with options to: Create New, Duplicate, Edit
3. User clicks "Create New List"
4. System auto-generates list name based on date (e.g., "12 OCT LIST")
   - If another list exists with same date, appends "#2", "#3", etc.
5. User can optionally set a list emoji/icon
6. User adds items by:
   - **Option A**: Searching/selecting existing items (e.g., "Mango", "Wheat", "Napkins")
   - **Option B**: Creating new custom items on-the-fly
7. For each item, user selects quantity type and amount:
   - **Weight-based**: 1kg, 2kg, 1/2kg, 250gms, etc.
   - **Money-based**: 20rs, 100rs, etc.
   - **Count-based**: 1 item, 10 items, etc.
8. User saves the list
9. List appears in "My Lists" tab

**Creating Custom Items:**
1. While building a list, user types item name not found in search
2. System prompts: "Create new item: [Name]?"
3. User fills in item details:
   - Item name in English (required)
   - Item name in Hindi (optional)
   - Item name in Marathi (optional)
4. User selects quantity type (weight/money/count)
5. User sets default quantities for this item
6. Item is created and added to both global items collection and current list

**Sharing a List:**
1. User opens a list from "My Lists" or clicks share button
2. System shows list of all registered users (by name)
3. User selects one or multiple users to share with
4. User can also share with themselves
5. Shared users see the list in their "To Buy" tab

**Using the "To Buy" Tab:**
1. User switches to "To Buy" tab on home screen
2. User sees all lists shared with them by others
3. Lists display like a todo checklist
4. User checks off items as they buy them
5. Original list owner sees updates in real-time

**Using an Existing List:**
1. User opens a list from "My Lists" or "To Buy"
2. Logger can add/edit/remove items
3. Buyer can mark items as "bought"
4. Both users see real-time updates

**Duplicating a List:**
1. User selects a past list
2. Clicks "Duplicate"
3. System creates a copy with all items (unmarked as bought)
4. New date-based name is auto-generated
5. User can edit before saving

**Commenting on a List:**
1. User opens a list (from "My Lists" or "To Buy")
2. Below items, user sees comments section
3. User can view all comments from collaborators
4. User can add new comment by tapping comment input
5. Comments show user name and timestamp
6. Users can delete their own comments

## Data Models

### Database: "auth"

**Auth Collection:**
```javascript
{
  userId: String,           // Unique user identifier
  name: String,            // User's name
  passkey: {
    credentialId: String,   // WebAuthn credential ID
    publicKey: String,      // Public key for verification
    counter: Number,        // Signature counter
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Database: "sabzzi"

**Users Collection:**
```javascript
{
  userId: String,           // Reference to auth.userId
  name: String,            // User's name
  myLists: [String],       // Array of listIds created by user
  sharedLists: [String],   // Array of listIds shared with user
  preferences: {
    hapticsEnabled: Boolean, // Default: true
    // Future: notifications, theme, language preference
  },
  activityLog: [
    {
      action: String,      // "created_list", "bought_item", "logged_item", "shared_list"
      listId: String,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Items Collection:**
```javascript
{
  itemId: String,          // Unique item identifier
  name: String,            // Item name in English (e.g., "Mango", "Wheat", "Napkins")
  nameHindi: String,       // Optional: Item name in Hindi (e.g., "आम", "गेहूं")
  nameMarathi: String,     // Optional: Item name in Marathi (e.g., "आंबा", "गहू")
  category: String,        // Optional: "vegetables", "grains", "household"
  quantityType: String,    // "weight" | "money" | "count"
  commonQuantities: [      // Preset quantity options for this item
    {
      value: Number,       // e.g., 1, 2, 0.5, 250
      unit: String         // e.g., "kg", "gms", "rs", "items"
    }
  ],
  createdBy: String,       // userId who created this item
  createdAt: Date,
  updatedAt: Date
}
```

**Lists Collection:**
```javascript
{
  listId: String,          // Unique list identifier
  name: String,            // Auto-generated date-based name (e.g., "12 OCT LIST", "12 OCT LIST#2")
  emoji: String,           // Optional emoji/icon for the list (e.g., "🥬", "🛒")
  createdBy: String,       // userId who created the list
  sharedWith: [String],    // Array of userIds this list is shared with
  items: [
    {
      itemId: String,      // Reference to items collection
      itemName: String,    // Denormalized for quick access (English)
      itemNameHindi: String,    // Optional: Hindi name
      itemNameMarathi: String,  // Optional: Marathi name
      quantity: {
        value: Number,
        unit: String       // "kg", "gms", "rs", "items"
      },
      isBought: Boolean,   // Marked by buyer
      boughtBy: String,    // userId who marked as bought
      boughtAt: Date
    }
  ],
  comments: [
    {
      commentId: String,   // Unique comment identifier
      userId: String,      // User who commented
      userName: String,    // Denormalized user name
      text: String,        // Comment text
      createdAt: Date
    }
  ],
  status: String,          // "active", "completed", "archived"
  createdAt: Date,
  updatedAt: Date,
  duplicatedFrom: String   // listId if duplicated from another list
}
```

## API Design

### Authentication Endpoints
- `POST /api/auth/validate-pin` - Validate dev pin (4452)
- `POST /api/auth/register-begin` - Start passkey registration
- `POST /api/auth/register-complete` - Complete passkey registration
- `POST /api/auth/login-begin` - Start passkey authentication
- `POST /api/auth/login-complete` - Complete passkey authentication

### User Endpoints
- `GET /api/users` - Get all registered users (for sharing interface)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me/preferences` - Update user preferences (haptic feedback, etc.)
- `POST /api/auth/logout` - Logout current user

### List Management Endpoints
- `GET /api/lists/my-lists` - Get all lists created by logged-in user
- `GET /api/lists/to-buy` - Get all lists shared with logged-in user
- `GET /api/lists/:listId` - Get specific list details
- `POST /api/lists` - Create new list (auto-generates date-based name)
- `PUT /api/lists/:listId` - Update list (add/remove items, change emoji)
- `POST /api/lists/:listId/duplicate` - Duplicate existing list
- `DELETE /api/lists/:listId` - Delete list

### Sharing Endpoints
- `POST /api/lists/:listId/share` - Share list with users (body: { userIds: [String] })
- `DELETE /api/lists/:listId/share/:userId` - Unshare list from specific user
- `GET /api/lists/:listId/shared-with` - Get list of users this list is shared with

### Item Management Endpoints
- `GET /api/items` - Get all available items
- `GET /api/items/search?q=query` - Search items by name
- `POST /api/items` - Create new item (on-the-fly during list creation)
- `PUT /api/items/:itemId` - Update item details
- `DELETE /api/items/:itemId` - Delete item

### Shopping Endpoints
- `POST /api/lists/:listId/items/:itemId/mark-bought` - Mark item as bought
- `POST /api/lists/:listId/items/:itemId/unmark-bought` - Unmark item as bought

### Comment Endpoints
- `GET /api/lists/:listId/comments` - Get all comments for a list
- `POST /api/lists/:listId/comments` - Add a comment to a list (body: { text: String })
- `DELETE /api/lists/:listId/comments/:commentId` - Delete a comment

## UI/UX Design

### General Design Principles
- **Mobile-First**: Optimized for mobile devices (responsive design)
  - Minimum 44px touch targets for all interactive elements
  - Large, thumb-friendly buttons and controls
  - Adequate spacing between touch elements
  - Single-column layouts for easy thumb navigation
- **PWA Features**:
  - Installable via "Add to Home Screen"
  - Offline-capable (to be determined)
  - App-like experience on mobile devices
- **Haptic Feedback**:
  - Tactile feedback on all button taps
  - Checkbox toggle vibrations
  - User-configurable in settings
  - Enhances native app feel
- **Bilingual Support**:
  - English as primary language
  - Hindi and Marathi as optional secondary languages
  - Regional language names shown below English
  - Helps non-English speaking users

### Screen Layouts

**Home Screen:**
- Header: "Sabzzi" with settings icon (gear/cog) on right
- Two tabs/sections:
  - **My Lists** (default active)
  - **To Buy**
- Tab content displays respective lists
- Settings icon triggers haptic feedback on tap

**My Lists Tab:**
- List cards showing:
  - List emoji/icon (if set)
  - List name (e.g., "12 OCT LIST")
  - Number of items
  - Number of items bought vs total (e.g., "3/5 bought")
  - Created date
  - Action buttons: Share, Duplicate, Edit, Open
- Floating action button: "+" to create new list

**To Buy Tab:**
- List cards showing lists shared with user:
  - List emoji/icon (if set)
  - List name
  - Creator's name (e.g., "Shared by John")
  - Progress bar: X of Y items bought
  - Open button
- Todo-style checklist view
- Each item has checkbox to mark as bought

**Create/Edit List Screen:**
- Header: Auto-generated list name (e.g., "12 OCT LIST") - editable
- Emoji picker button to set list emoji/icon
- Search bar to find items or create new ones
  - Shows existing items as suggestions
  - Option to "Create new item: [Name]" if not found
- List of added items with:
  - Item name
  - Quantity selector (based on item's quantityType)
    - Weight: Dropdown or input (kg, gms)
    - Money: Input field (rs)
    - Count: Counter buttons (+/-)
  - Remove button
- Save button at bottom
- Share button (after list is created)

**Create New Item Modal:**
- Triggered when user creates custom item
- Mobile-friendly vertical layout
- Fields:
  - Item name in English (required, pre-filled)
  - Item name in Hindi (optional, shows Hindi keyboard support)
  - Item name in Marathi (optional, shows Marathi keyboard support)
  - Quantity type selector (Weight/Money/Count) - Large touch-friendly buttons
  - Default quantity values
- Large "Create" button at bottom (min height 44px for mobile)

**Share List Modal:**
- Header: "Share List"
- Search bar to filter users
- List of all registered users showing:
  - User name
  - Checkbox to select for sharing
- Option to share with self
- Selected users highlighted
- Share button at bottom

**List Detail Screen:**
- Header: List name with emoji and edit icon
- Progress bar: X of Y items bought
- Item list showing:
  - Item name (English)
  - Hindi/Marathi name below in smaller grey text (if available)
  - Quantity
  - Large checkbox to mark as bought (min 44px touch target)
  - Visual indication of bought status (strikethrough, grey)
  - Who bought it and when (if bought)
- Actions: Share, Duplicate, Archive, Delete (large touch-friendly buttons)
- **Comments Section** (below items):
  - Header: "Comments" with comment count
  - List of comments showing:
    - User name and timestamp
    - Comment text
    - Delete button (only for own comments)
  - Fixed comment input at bottom:
    - Text input field (expandable)
    - Send button (large, mobile-friendly)
    - Auto-focuses on tap

**Item Quantity Selection:**
For each item type, appropriate UI:
- **Weight-based items**:
  - Quick select chips: 250gms, 500gms, 1kg, 2kg (min 44px touch target)
  - Custom input option with large input field
- **Money-based items**:
  - Quick select chips: 20rs, 50rs, 100rs (min 44px touch target)
  - Custom input option with large input field
- **Count-based items**:
  - Stepper control (+/-) with large buttons (min 44px)
  - Number display in center
  - Input for custom count

**Settings Screen:**
- Header: "Settings"
- User profile section:
  - User name display
  - User ID
- App settings:
  - Haptic feedback toggle (on/off)
  - Notifications toggle (future)
- Account actions:
  - Large "Logout" button (red, destructive style)
  - Confirmation dialog on logout

## Technical Decisions

1. **MongoDB**: Chosen as the database for flexible schema and scalability
   - Database "auth": Authentication data
   - Database "sabzzi": Application data (users, items, lists)
2. **Shadcn UI**: Pre-installed UI component library for consistent design
3. **Next.js**: Framework for server-side rendering and API routes
4. **PWA Approach**: Native-like mobile experience without app store deployment
5. **Passkey Authentication (WebAuthn)**: Passwordless authentication using device biometrics/PIN
   - More secure than traditional passwords
   - Better mobile experience
   - No password storage or management needed
6. **Dev Pin Protection**: Hardcoded pin (4452) for registration to limit access during development
7. **Three Quantity Types**: Flexible item measurement system
   - Weight-based for produce and bulk items
   - Money-based for items bought by budget
   - Count-based for discrete items
8. **Denormalized Data**: Store item names in lists collection for quick access
9. **Auto-generated List Names**: Date-based naming (e.g., "12 OCT LIST", "12 OCT LIST#2")
   - Eliminates need for users to name lists
   - Easy to identify and organize
   - Automatic numbering for multiple lists on same day
10. **On-the-fly Item Creation**: Users can create items while building lists
   - No pre-population needed
   - Flexible and user-friendly
11. **List Sharing**: Multi-user collaboration
    - Lists can be shared with multiple users
    - Shared users see lists in "To Buy" tab
    - Real-time updates across all users
12. **Emoji/Icon Support**: Visual identification for lists
    - Optional but helpful for quick recognition
13. **Bilingual Support (Hindi/Marathi)**: Items can have names in multiple languages
    - English name required
    - Hindi and Marathi names optional
    - Helps users who don't know English
    - Shows regional language below English name
14. **Comments Feature**: Collaboration via list comments
    - Users can comment on shared lists
    - View all comments from collaborators
    - Delete own comments
    - Real-time comment updates
15. **Haptic Feedback**: Native-like mobile experience
    - Vibration feedback on button taps
    - Checkbox toggles with haptic
    - User can disable in settings
    - Uses Web Vibration API
16. **Mobile-First Design Principles**:
    - Minimum 44px touch targets for all interactive elements
    - Large, thumb-friendly buttons
    - Clear visual hierarchy
    - Adequate spacing between touch elements

## Implementation Plan

### Phase 1: Authentication Setup
1. Set up MongoDB connection (auth database)
2. Create login screen UI with two buttons
3. Implement dev pin validation (4452)
4. Integrate WebAuthn for passkey registration
5. Integrate WebAuthn for passkey login
6. Create user profile in auth collection (name, userId)
7. Add session management

### Phase 2: Database & Items Setup
1. Set up MongoDB connection to "sabzzi" database
2. Create collections: users, items, lists
3. Create API endpoints for items CRUD
4. Implement on-the-fly item creation
5. Add bilingual support (Hindi/Marathi) to items schema

### Phase 3: Home Screen & Navigation
1. Create home screen with tab navigation
2. Implement "My Lists" tab
3. Implement "To Buy" tab
4. Add settings icon in header
5. Create navigation between screens
6. Implement haptic feedback utility (Web Vibration API)
7. Apply haptics to all interactive elements

### Phase 4: List Creation & Management
1. Implement "Create New List" flow with auto-generated date-based names
2. Add logic to append "#2", "#3" for multiple lists on same date
3. Build item search/selection interface
4. Implement "Create new item" prompt when item not found
5. Add bilingual input fields (English/Hindi/Marathi) to item creation
6. Display bilingual item names in lists (English primary, regional below)
7. Implement quantity selection UI (3 types: weight/money/count) with large touch targets
8. Add emoji/icon picker for lists
9. Create "List Detail" screen
10. Implement "Duplicate List" feature
11. Add edit/delete list functionality

### Phase 5: Sharing Feature
1. Create "Share List" modal
2. Implement user selection interface
3. Build API endpoints for sharing
4. Update "To Buy" tab to show shared lists
5. Display list creator name on shared lists
6. Handle permissions (who can edit vs. only buy)

### Phase 6: Buying Flow
1. Implement mark item as bought/unbought
2. Add buyer tracking (who bought, when)
3. Show visual indicators for bought items (strikethrough, grey)
4. Add progress tracking (X of Y items bought)
5. Todo-style checklist view for "To Buy" tab

### Phase 7: Comments & Settings
1. Implement comments section in List Detail screen
2. Create comment API endpoints
3. Add comment input with send button
4. Show comment author and timestamp
5. Add delete comment functionality (own comments only)
6. Create Settings screen
7. Add haptic feedback toggle
8. Implement logout functionality
9. Add user preferences storage

### Phase 8: Polish & PWA
1. Add PWA manifest and service worker
2. Optimize for mobile responsiveness (ensure all touch targets ≥44px)
3. Add loading states and error handling
4. Implement optimistic UI updates
5. Add real-time updates for shared lists and comments
6. Test haptic feedback across all interactions
7. Add offline support (optional)

## Open Questions

1. ✅ Should list names be required or optional? - **Resolved**: Auto-generated based on date
2. ✅ Should multiple users be able to collaborate on the same list? - **Resolved**: Yes, via sharing
3. Should there be notifications when someone buys an item?
4. What analytics/reports would be useful? (spending trends, common items, etc.)
5. Should there be categories for items beyond just name?
6. Session management: JWT, cookies, or other approach?
7. Should past lists be archived or kept indefinitely?
8. Permission model: Should shared users be able to edit lists, or only mark items as bought?
9. Should there be a limit on how many users can be added to a list?
