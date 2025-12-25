# Frontend - Next.js Web Application

[← Back to Main Documentation](../README.md)

## Overview

The frontend is a modern Next.js 16 application built with TypeScript, React, and Tailwind CSS. It provides an intuitive interface for capturing media, verifying authenticity, and managing evidence packages with both guest and authenticated user modes.

## Architecture

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Landing page
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── camera/              # Photo/video capture
│   ├── verify/              # Media verification
│   ├── gallery/             # Media gallery
│   ├── profile/             # User profile
│   ├── signin/              # Sign in page
│   ├── signup/              # Sign up page
│   └── api/                 # API routes (if any)
├── components/               # React components
│   ├── ui/                  # Radix UI components
│   ├── theme-provider.tsx   # Dark/light mode
│   └── delete-confirmation-modal.tsx
├── lib/                     # Core libraries
│   ├── utils.ts             # Utility functions
│   ├── storage.ts           # Evidence package system
│   ├── supabase/            # Supabase integration
│   └── video/               # Video frame extraction
├── hooks/                   # Custom React hooks
├── public/                  # Static assets
└── package.json             # Dependencies
```

## Key Features

### 1. **Camera Page** (`app/camera/page.tsx`)

**Capabilities**:

- **Photo Capture**: Take photos with device camera
- **Video Recording**: Record videos with MediaRecorder API
- **GPS Tracking**: Automatic geolocation capture
- **Flash Control**: Toggle flash (if supported)
- **Gallery Preview**: Quick access to latest capture
- **Evidence Packages**: Save media with metadata for offline verification

**Workflow**:

1. Request camera and location permissions
2. Capture photo or record video
3. Extract GPS coordinates and timestamp
4. Upload to backend blockchain API
5. Store in Supabase (authenticated) or LocalStorage (guest)
6. Generate downloadable evidence package

**Video Processing**:

- Extract evenly-spaced frames from video
- Hash each frame individually
- Store all frame hashes in blockchain
- Enable frame-by-frame verification

### 2. **Verify Page** (`app/verify/page.tsx`)

**Capabilities**:

- **File Upload**: Drag-and-drop or file picker
- **Hash Verification**: Compare against blockchain
- **Frame Analysis**: Verify individual video frames
- **Evidence Bundle Import**: Load saved evidence packages
- **Location Display**: Show GPS coordinates
- **Verification Status**: Visual verified/altered/insufficient indicators

**Verification States**:

- **Verified**: Exact match found in blockchain
- **Altered**: No match (tampered or fake)
- **Insufficient**: Missing metadata or frames

**Video Verification**:

- Extract frames from uploaded video
- Verify each frame against blockchain
- Display percentage of verified frames
- Highlight failed frame indices

### 3. **Gallery Page** (`app/gallery/page.tsx`)

**Features**:

- **Media Grid**: Display all user media
- **Verification Badges**: Show verified status
- **Location Tags**: Display capture location
- **Delete Functionality**: Remove media (with confirmation)
- **Evidence Download**: Export evidence packages
- **Responsive Design**: Mobile-optimized layout

### 4. **Authentication Pages**

- **Sign In** (`app/signin/page.tsx`): Supabase email/password authentication
- **Sign Up** (`app/signup/page.tsx`): User registration
- **Email Verification** (`app/verify-email/page.tsx`): Email confirmation

### 5. **Profile Page** (`app/profile/page.tsx`)

- User information display
- Account settings
- Sign out functionality

## Core Libraries

### **Supabase Integration** (`lib/supabase/`)

#### `client.ts`

- Supabase client initialization
- Environment variable configuration

#### `auth-provider.tsx`

- React context for authentication
- User state management
- Session handling

#### `media.ts`

- **`uploadMedia()`**: Upload to Supabase Storage + create DB record
- **`getUserMedia()`**: Fetch user's media items
- **`getMediaUrl()`**: Generate signed URLs
- **`updateMediaVerification()`**: Update verified status
- **`deleteMedia()`**: Remove media and storage files

**Media Metadata Schema**:

```typescript
{
  hash: string,
  latitude: string,
  longitude: string,
  device?: string,
  blockchainTxId?: string,
  blockchainBlock?: number,
  blockchainTimestamp?: string,
  verificationStatus?: string,

  // Video-specific
  videoFrameCount?: number,
  videoFrameTimesSec?: number[],
  videoFrameTimestamps?: string[],
  videoFrameHashes?: string[],
  videoFrameBlockIndices?: number[],
  videoVerifiedFrameCount?: number,
  videoFailedFrameIndices?: number[]
}
```

### **Evidence Package System** (`lib/storage.ts`)

**Purpose**: Create portable verification bundles

**Package Structure**:

```typescript
{
  version: 1,
  id: string,
  createdAt: string,
  userId: string,
  mediaType: "photo" | "video",
  captureTimestamp: string,
  mediaDataUrl?: string,      // Base64-encoded media
  metadata: Record<string, any>
}
```

**Functions**:

- `createEvidencePackageV1()`: Bundle media + metadata
- `saveEvidencePackage()`: Save to LocalStorage
- `listEvidencePackages()`: Retrieve saved packages
- `downloadEvidencePackage()`: Export as JSON file
- `readEvidencePackageFromJsonFile()`: Import JSON file
- `blobToDataUrl()`: Convert Blob to Data URL

### **Video Frame Extraction** (`lib/video/`)

**Functions**:

- `extractVideoFrames()`: Extract frames at specific times
- `getVideoDurationSeconds()`: Get video length
- `makeEvenlySpacedTimes()`: Calculate frame timestamps

**Process**:

1. Load video in `<video>` element
2. Calculate evenly-spaced timestamps
3. Seek to each timestamp
4. Capture frame to canvas
5. Convert to Blob
6. Return array of frames

## UI Components (`components/ui/`)

Built with **Radix UI** primitives:

- **Layout**: Card, Separator, Sidebar, Sheet
- **Forms**: Input, Textarea, Select, Checkbox, Radio, Switch
- **Feedback**: Alert, Toast, Dialog, Progress, Spinner
- **Navigation**: Button, Tabs, Breadcrumb, Pagination
- **Data Display**: Table, Avatar, Badge, Tooltip
- **Overlays**: Modal, Popover, Dropdown, Context Menu

**Styling**: Tailwind CSS with `class-variance-authority` for variants

## Dependencies

### Core Framework

```json
{
  "next": "16.0.10",
  "react": "latest",
  "typescript": "latest"
}
```

### UI Libraries

```json
{
  "@radix-ui/react-*": "latest", // Component primitives
  "lucide-react": "^0.454.0", // Icons
  "tailwindcss": "latest", // Styling
  "next-themes": "^0.4.6" // Dark mode
}
```

### Data & Forms

```json
{
  "@supabase/supabase-js": "latest", // Database & Auth
  "react-hook-form": "latest", // Form handling
  "zod": "latest" // Validation
}
```

### Utilities

```json
{
  "date-fns": "4.1.0", // Date formatting
  "clsx": "^2.1.1", // Classname utility
  "embla-carousel-react": "8.5.1" // Carousels
}
```

## Running the Frontend

### Installation

```bash
cd frontend
pnpm install
```

### Development

```bash
pnpm dev
```

Runs on `http://localhost:3000`

### Build

```bash
pnpm build
pnpm start
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Authentication Flow

1. **Guest Mode**: Uses LocalStorage for evidence packages
2. **Authenticated Mode**: Supabase authentication + database
3. **Session Management**: Automatic token refresh
4. **Protected Routes**: Redirect to signin if not authenticated

## Key Design Patterns

### 1. **Server vs Client Components**

- Landing page: Server component
- Camera/Verify: Client components (use device APIs)
- Layouts: Server components

### 2. **State Management**

- React Context: Authentication state
- `useState`: Local component state
- LocalStorage: Evidence packages (guest mode)
- Supabase: Authenticated user data

### 3. **File Handling**

- FileReader API for previews
- Canvas API for video frames
- Blob/File API for uploads
- Data URLs for evidence packages

### 4. **Error Handling**

- Try-catch blocks
- Toast notifications for user feedback
- Graceful degradation (guest mode fallback)

## Responsive Design

- **Mobile-first**: Optimized for touch devices
- **Camera Access**: Uses device cameras
- **Touch Gestures**: Swipe, tap, pinch-to-zoom ready
- **Breakpoints**: Tailwind responsive utilities

## Data Flow

### Photo Capture Flow

```
Camera API → Canvas → Blob → Backend API → Blockchain
                           → Supabase Storage → Database
```

### Video Capture Flow

```
MediaRecorder → Blob → Frame Extraction → Multiple Hashes
                                        → Blockchain (per frame)
                                        → Supabase Storage
```

### Verification Flow

```
Upload File → Extract Metadata → Hash Calculation
           → Backend API → Blockchain Lookup → Verification Result
```

## Known Issues

- **Safari Video**: May have MediaRecorder limitations
- **GPS Permissions**: Requires HTTPS in production
- **Large Files**: Video uploads may be slow
- **Frame Extraction**: CPU-intensive on mobile

## Future Enhancements

- [ ] Progressive Web App (PWA) support
- [ ] Offline mode with service workers
- [ ] Bulk verification
- [ ] Advanced analytics dashboard
- [ ] Social sharing of verified media
- [ ] QR code evidence packages

---

**Framework**: Next.js 16 (App Router)

[View Backend Documentation](../backend/README.md) | [Back to Main](../README.md)
