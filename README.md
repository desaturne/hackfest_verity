<div align="center">
  <img src="./public/logo.png" alt="Factum Logo" width="200"/>
  <h1>Factum (Verity)</h1>
  <p><strong>Blockchain-Based Media Verification Platform</strong></p>
</div>

---

## Project Overview

**Factum** (formerly Verity) is a comprehensive media verification platform that leverages blockchain technology to ensure the authenticity of photos and videos. The platform combines metadata hashing, location tracking, and blockchain immutability to detect alterations and verify the integrity of digital media.

## Key Features

- **Photo & Video Capture**: Capture media with embedded metadata (location, timestamp)
- **Blockchain Verification**: Store cryptographic hashes on an immutable blockchain
- **Media Authentication**: Verify if media has been altered or tampered with
- **Location Tracking**: Embed and verify GPS coordinates in media
- **Video Frame Analysis**: Extract and verify individual frames from videos
- **Evidence Packages**: Download verifiable evidence bundles with all metadata
- **Guest & Authenticated Modes**: Use without sign-in or with full Supabase authentication

## Project Structure

```
hackfest_verity/
├── backend/              # Node.js Express API with blockchain implementation
├── frontend/             # Next.js 16 web application with React
├── supabase/             # Database migrations and storage configuration
└── README.md             # This file
```

## Documentation Links

- **[Backend Documentation](backend/README.md)** - API, blockchain, and server details
- **[Frontend Documentation](frontend/README.md)** - UI, components, and client logic
- **[Supabase Documentation](supabase/migrations/README.md)** - Database schema and migrations

## Quick Start

### Prerequisites

- **Node.js** 16+ and npm/pnpm
- **MongoDB** (local or cloud instance)
- **Supabase** account (for authentication and storage)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/desaturne/hackfest_verity.git
   cd hackfest_verity
   ```

2. **Setup Backend**

   ```bash
   cd backend
   npm install
   npm start
   ```

   Backend runs on `http://localhost:5000`

3. **Setup Frontend**

   ```bash
   cd frontend
   pnpm install
   pnpm dev
   ```

   Frontend runs on `http://localhost:3000`

4. **Configure Environment Variables**
   - Set up MongoDB connection in `backend/server.js`
   - Configure Supabase credentials in frontend `.env.local`

## Core Concepts

### Blockchain-Based Verification

1. **Capture**: Media is captured with metadata (location, timestamp)
2. **Normalize**: Images are normalized to consistent format (1024x1024 JPEG)
3. **Hash**: SHA-256 hash generated from image + metadata
4. **Store**: Hash stored in blockchain block with Proof-of-Work
5. **Verify**: Re-hash submitted media and compare against blockchain

### Evidence Package System

- Media and metadata bundled together
- Downloadable JSON with embedded data URLs
- Portable verification across devices
- Supports both photos and video frames

## Technology Stack

### Backend

- **Express.js** - REST API server
- **MongoDB** + Mongoose - Database
- **Custom Blockchain** - Proof-of-Work implementation
- **Sharp** - Image processing
- **Crypto** - SHA-256 hashing

### Frontend

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Radix UI** - Component library
- **Supabase** - Authentication & storage
- **Tailwind CSS** - Styling
- **Lucide Icons** - UI icons

### Database

- **Supabase PostgreSQL** - User media metadata
- **MongoDB** - Blockchain storage
- **Supabase Storage** - Media file storage

## Application Pages

- `/` - Landing page
- `/signin` & `/signup` - Authentication
- `/camera` - Capture photos/videos
- `/verify` - Verify media authenticity
- `/gallery` - View captured media
- `/profile` - User profile management

## Security Features

- **Immutable Blockchain**: Tamper-proof hash storage
- **Metadata Binding**: Hash includes location + timestamp
- **Image Normalization**: Prevents compression-based evasion
- **Row-Level Security**: Supabase RLS policies
- **Guest Mode**: Privacy-focused local storage option

## Contributing

This project was developed for a hackathon. Feel free to fork and extend!

---

For detailed component documentation, see the respective README files in `backend/` and `frontend/` directories.
