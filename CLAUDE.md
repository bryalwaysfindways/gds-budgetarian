# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GDS Budgetarian is a full-stack e-commerce application for grocery/budget shopping with multi-role support (customer, admin, staff). Built with React 18, TypeScript, Vite, and Firebase.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- State Management: Zustand (auth + cart)
- Database: Firebase Firestore
- Storage: Firebase Storage
- Authentication: Firebase Auth (with email verification via EmailJS)
- UI Framework: Tailwind CSS
- Icons: Lucide React + React Icons
- Notifications: react-hot-toast
- Routing: React Router v6
- Email Service: EmailJS (for verification emails)
- Additional: xlsx (Excel export), react-phone-input-2, otp-input-react

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Architecture Overview

### State Management Strategy
**Zustand** is the primary state management solution:

1. **useAuthStore** (`src/store/useAuthStore.ts`): Global auth state
   - `user: User | null` - Current authenticated user with role
   - `loading: boolean` - Auth initialization status
   - No persistence - synced via AuthProvider

2. **useCartStore** (`src/store/useCartStore.ts`): Shopping cart with localStorage
   - Uses `persist` middleware with `'cart-storage'` key
   - Cart items: `{ productId, variantId, quantity, price }`
   - Handles add, remove, update quantity, clear operations

**ProductsContext** (`src/ProductsContext.tsx`): Legacy Context API for product selection on detail page. Consider migrating to Zustand in future.

### Authentication Flow
Firebase Auth + Firestore user documents with email verification:

1. User signs up → Firebase Auth creates account (emailVerified: false)
2. Verification token generated and stored in Firestore `verificationTokens` collection
3. EmailJS sends verification email with link to `/verify-email?token=...`
4. User clicks link → `VerifyEmail` page validates token and marks user as verified
5. **AuthProvider** (`src/components/AuthProvider.tsx`) listens to `onAuthStateChanged()`
6. Fetches or creates user document in `users` collection
7. Auto-creates missing user docs with default role `'user'`
8. Syncs user data (including role and emailVerified status) to `useAuthStore`
9. Roles: `'user' | 'admin' | 'staff'`

**Email Verification**:
- Tokens expire after 24 hours
- Unverified users blocked at login (`src/pages/Login.tsx`)
- EmailJS configuration via environment variables (see EMAILJS_SETUP_GUIDE.md)
- Requires: `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`

**ProtectedRoute** (`src/components/ProtectedRoute.tsx`):
- Redirects unauthenticated users to `/login`
- Blocks non-admin from `/admin/*` routes via `adminOnly` prop
- Blocks non-staff from `/staff/*` routes via `staffOnly` prop
- Shows loading spinner during auth initialization

### Route Structure
React Router v6 configuration in `src/App.tsx`:

```
/                    → Home (public)
/products            → Product listing (public)
/products/:id        → Product detail (public)
/cart                → Shopping cart (public)
/checkout            → Checkout form (requires login)
/orders              → Order history (protected)
/login               → Login page
/registration        → Sign-up page
/verify-email        → Email verification page (with token param)
/profile             → User profile (protected)
/admin/*             → Admin dashboard (protected, adminOnly)
  /products          → Product management
  /products/new      → Add product
  /products/:id      → Edit product
  /orders            → Order management
  /customers         → Customer list
  /analytics         → Sales analytics
  /roles             → Role management
/staff/*             → Staff dashboard (protected, staffOnly)
```

**Layout behavior**:
- Navbar/Footer hidden on `/login`, `/signup`, `/registration`, `/verify-email`
- Admin/staff routes use full-width layout without container
- Regular pages use centered container with padding

### Firebase Integration
**Configuration** (`src/lib/firebase.ts`):
- Project ID: `jd-solutions-c0a40`
- Exports: `auth`, `db` (Firestore), `storage`
- Localhost debug mode enabled for development

**Firestore Collections**:
- `users`: User profiles with roles, addresses, and email verification status
- `products`: Product catalog with images, variants, pricing
- `orders`: Customer orders with cart items, delivery status, and payment details
- `verificationTokens`: Email verification tokens (24-hour expiry)
- `notifications`: Real-time notifications for admin/staff about new orders and updates

**Data Access Pattern**:
- No centralized API/service layer
- Components fetch directly from Firestore
- Auth state via Zustand (global)
- Cart state via Zustand with localStorage persistence

### Core Data Models

**User** (`src/types/index.ts`):
```typescript
{
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'staff';
  addresses: Address[];
  phone?: string;
  emailVerified?: boolean;
}
```

**Product**:
```typescript
{
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];              // Direct URLs, no upload UI
  category: string;
  tags: string[];
  variants: ProductVariant[];    // Size, color, inventory per variant
  inventory: number;
  isSale?: boolean;
  isFeatured?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**StatusHistory**:
```typescript
{
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  timestamp: Date;
  updatedBy?: string;            // Email of admin/staff who updated
}
```

**Order**:
```typescript
{
  id: string;
  userId: string;
  items: CartItem[];
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;         // 'cod' or 'gcash'
  shippingMethod: string;
  subtotal: number;
  shippingCost: number;          // Fixed at ₱99
  total: number;
  createdAt: Date;
  updatedAt: Date;
  validIdUrl?: string;           // Valid ID upload for GCash payment
  gcashNumber?: string;          // GCash mobile number
  email?: string;                // Customer email (for guest orders)
  firstName?: string;            // Customer first name
  lastName?: string;             // Customer last name
  phone?: string;                // Contact phone number
  statusHistory?: StatusHistory[]; // Track all status changes with timestamps
}
```

**Notification**:
```typescript
{
  id: string;
  type: 'new_order' | 'order_updated' | 'order_cancelled';
  orderId: string;
  message: string;
  recipientRole: 'admin' | 'staff' | 'both';
  read: boolean;
  createdAt: Timestamp;
  metadata?: {
    customerName?: string;
    orderTotal?: number;
    paymentMethod?: string;
  };
}
```

### Payment Integration
**Current Implementation**:
- Cash on Delivery (COD) and GCash (manual transfer) only
- `@stripe/stripe-js` package installed but NOT used
- GCash validates Philippine mobile format: `09XXXXXXXXX`
- GCash orders require valid ID upload (validIdUrl stored in order)
- Checkout flow in `src/pages/Checkout.tsx`
- Customer contact info collected at checkout (firstName, lastName, email, phone)

### Notification System
**Real-time Notifications** (`src/lib/notifications.ts`):
- Notifications created automatically when new orders are placed
- Real-time updates via Firestore `onSnapshot` listeners
- Visible to both admin and staff roles
- Features:
  - Unread count badge on bell icon
  - Read/unread status tracking
  - Click to navigate to order details
  - Mark all as read functionality
  - Timestamp display

**Notification Types**:
- `new_order`: Triggered when customer places order
- `order_updated`: When order status changes (future enhancement)
- `order_cancelled`: When order is cancelled (future enhancement)

**AdminHeader Component** (`src/components/AdminHeader.tsx`):
- Displays on both admin and staff dashboards
- Shows logo, role indicator, notification bell, and profile dropdown
- Profile dropdown shows email only when clicked (not beside avatar)
- Notifications dropdown with real-time updates
- Click notification → marks as read → navigates to order page with auto-expand

**Order Management**:
- Both admin and staff use expandable list view (`src/pages/admin/Orders.tsx` and `src/pages/staff/Dashboard.tsx`)
- Click notification → order auto-expands with smooth scroll and highlight effect
- Uses `useLocation` state to pass orderId between notification and order page
- Order highlighted with blue ring for 2 seconds when opened from notification

**Order Status History Tracking**:
- Every status update creates a new entry in `statusHistory` array
- Tracks: status, timestamp, updatedBy (admin/staff email)
- Initial order created with status='pending' by 'system'
- Status history displayed in all order views:
  - **Admin Orders** (`src/pages/admin/Orders.tsx`): Expandable section with timeline
  - **Staff Dashboard** (`src/pages/staff/Dashboard.tsx`): Expandable section with timeline
  - **Customer Orders** (`src/pages/Orders.tsx`): "View History" button shows collapsible timeline
- Timeline shows:
  - Status badge with color and icon
  - Timestamp in Philippine locale format
  - Who updated the status (admin/staff email)
  - "Current" badge on latest status
- Sorted newest first for easy tracking

### Key Features

**Shopping Flow**:
1. Product listing with category/search filtering
2. Sort by price (asc/desc) and rating
3. LocalStorage product caching (5-minute TTL)
4. Add to cart with variant selection (size, color)
5. Cart persistence via Zustand localStorage
6. Address collection during checkout
7. Order creation in Firestore
8. Cart clearing on successful order

**Admin Dashboard**:
- Sidebar navigation with role-based highlighting
- Product CRUD operations
- Order management with delivery status updates
- Customer list viewing
- Analytics dashboard with sales data
- Role management (update user roles between user/admin/staff)
- Order export to Excel (xlsx) functionality

**Order Management**:
- Admins can mark orders as delivered
- Order list with customer details
- Timestamp tracking (createdAt, updatedAt)

## Styling & Design

**Tailwind CSS** with custom theme:
- Primary: Red (`#e53e3e` / `#c53030`)
- Secondary: Yellow (`#ecc94b` / `#d69e2e`)
- Grocery store themed (red/yellow gradient)

**Common Patterns**:
- Cards with shadows and hover effects
- Gradient backgrounds on admin pages
- Responsive grid layouts (1 col → 4 cols)
- Modal dialogs with backdrop blur

## Component Communication Patterns

**Data Flow**:
1. Components fetch Firestore data directly (no service layer)
2. Auth state via Zustand (global)
3. Cart state via Zustand with localStorage persistence
4. Product selection via Context API (page-level)
5. Toast notifications for user feedback (`react-hot-toast`)

**No centralized data fetching** - each page owns its Firestore queries.

## Naming Conventions

- **Pages**: PascalCase (e.g., `ProductDetail.tsx`)
- **Stores**: Export hook names (e.g., `useAuthStore`)
- **Components**: Reusable UI in `components/` folder
- **Pages**: Route-level components in `pages/` folder
- **Imports**: Absolute imports from `src/` root (standard Vite)

## Form Handling Patterns

- Controlled components with `useState`
- Inline validation with error state
- Toast feedback for user actions
- Try/catch with error toasts for async operations

## Environment Variables

Required environment variables in `.env` file:

```env
# Firebase Configuration (already in firebase.ts)
# Add these for EmailJS:
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key
```

See `EMAILJS_SETUP_GUIDE.md` for complete EmailJS setup instructions.

## Product Management

**Image Upload System** (`src/lib/imageUpload.ts`):
- Direct file upload from device to Firebase Storage
- Multiple image selection support
- Real-time upload progress tracking
- Automatic image validation (max 5MB, JPG/PNG/GIF/WebP)
- Automatic cleanup when images are removed
- Images stored in `products/` folder in Firebase Storage

**Product Form** (`src/pages/admin/ProductForm.tsx`):
- Unified form for both Add and Edit operations
- Edit mode: Fetches existing product data with loading state
- Add new images: Uploads to Firebase Storage and appends to existing images
- Remove images: Deletes from both product and Firebase Storage
- Preserves `createdAt` timestamp when updating products
- Image preview grid with hover effects and remove buttons

## Known Limitations

1. **Stripe Integration**: Package installed but unused - payments hardcoded to COD/GCash
2. **ProductContext**: Could be migrated to Zustand store
3. **Inventory Tracking**: Not actively enforced during cart operations
4. **Pagination**: No pagination on product list (loads all products)
5. **Order Emails**: Email verification implemented, but order confirmation emails not yet added

## Deployment

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

The app is configured for Vercel deployment with standard Vite build output.

**Important for Production**:
1. Set all environment variables in Vercel dashboard (Project Settings → Environment Variables)
2. Include all `VITE_EMAILJS_*` variables for email verification to work
3. Ensure Firebase Security Rules are properly configured
4. Test email verification flow in production environment

## Firebase Security Note

The Firebase API key is exposed in `src/lib/firebase.ts`. This is normal for client-side Firebase apps - security is enforced via Firebase Security Rules on the backend, not by hiding the API key. Ensure Firestore and Storage rules are properly configured to prevent unauthorized access.
