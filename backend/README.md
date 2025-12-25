# Backend - Blockchain & API Server

[← Back to Main Documentation](../README.md)

## Overview

The backend is a Node.js Express application that implements a custom blockchain for storing and verifying media hashes. It provides REST API endpoints for uploading evidence and verifying media authenticity.

## Architecture

```
backend/
├── server.js                 # Express server & MongoDB connection
├── blockchain/               # In-memory blockchain implementation
│   ├── block.js             # Block class with PoW mining
│   └── blockChain.js        # Blockchain class & validation
├── controllers/              # Request handlers
│   └── evidenceController.js # Upload & verify logic
├── models/                   # Mongoose schemas for MongoDB
│   └── blockModel.js        # Block persistence schema
├── routes/                   # API route definitions
│   └── evidenceRoutes       # Evidence endpoints with multer
├── utils/                    # Helper functions
│   ├── hashImage.js         # SHA-256 image hashing
│   └── normalizeImage.js    # Image normalization with Sharp
└── package.json             # Dependencies
```

**Architecture Flow:**

1. **Routes** (`evidenceRoutes`) define endpoints with multer middleware
2. **Controllers** (`evidenceController.js`) handle business logic
3. **Blockchain** (in-memory) manages chain state and validation
4. **Models** (`blockModel.js`) persist blocks to MongoDB
5. **Utils** provide image processing and hashing

## Key Components

### 1. Blockchain Implementation

#### **Block (`blockchain/block.js`)**

- **Purpose**: Individual block in the blockchain
- **Key Features**:
  - SHA-256 hash calculation
  - Proof-of-Work (PoW) mining with configurable difficulty
  - Nonce-based mining algorithm
  - Immutable once mined

**Block Structure**:

```javascript
{
  index: number,
  timestamp: number,
  data: object,
  previousHash: string,
  nonce: number,
  hash: string
}
```

#### **Blockchain (`blockchain/blockChain.js`)**

- **Purpose**: Manages chain of blocks
- **Key Features**:
  - Genesis block creation
  - Block addition with PoW
  - Chain validation
  - Difficulty level: 3 (configurable)

**Methods**:

- `createGenesisBlock()`: Initialize chain
- `addBlock(newBlock)`: Mine and append block
- `isChainValid()`: Verify chain integrity

### 2. Routes & Middleware

#### **Evidence Routes (`routes/evidenceRoutes`)**

- **Purpose**: Define API endpoints with middleware
- **Middleware**: Multer (memory storage for file uploads)
- **Endpoints**:
  - `POST /upload` → `uploadEvidence` controller
  - `POST /verify` → `verifyEvidence` controller

**Route Configuration**:

```javascript
router.post("/upload", upload.single("image"), uploadEvidence);
router.post("/verify", upload.single("image"), verifyEvidence);
```

### 3. API Controllers

#### **Evidence Controller (`controllers/evidenceController.js`)**

**Dependencies**:

- `Blockchain` class (in-memory chain)
- `Block` class (block creation)
- `BlockModel` (MongoDB persistence)
- `normalizeImage` & `hashImage` utilities

##### `uploadEvidence(req, res)`

- **Route**: `POST /api/evidence/upload`
- **Purpose**: Store media hash in blockchain and database
- **Process**:
  1. Receive image buffer from multer middleware
  2. Normalize image to 1024x1024 JPEG (Sharp)
  3. Generate SHA-256 hash from image + metadata
  4. Create new Block instance with evidence data
  5. Add block to in-memory blockchain (triggers PoW mining)
  6. Persist mined block to MongoDB via BlockModel
  7. Return success with block index and hash

**ReRoute**: `POST /api/evidence/verify`

- **Purpose**: Verify if media hash exists in blockchain
- **Process**:
  1. Receive image and metadata from multer
  2. Normalize image to same format (Sharp)
  3. Compute SHA-256 hash with metadata
  4. Query MongoDB for block with matching `data.photoHash`
  5. Return verification result with block details
     }

````

**Response**:
```json
{
  "success": true,
  "blockIndex": 1,
  "hash": "sha256_hash",
  "type": "photo"
}
````

##### `verifyEvidence(req, res)`

- **Endpoint**: `POST /api/evidence/verify`
- **Purpose**: Verify if media exists in blockchain
- **Process**:
  1. Normalize submitted image
  2. Compute hash with metadata
  3. Query MongoDB for matching hash
  4. Return verification result

**Response**:

```json
{
  "verified": true,
  "blockIndex": 1,
  "timestamp": 1640000000000
}
```

4. Database Model

#### **Block Model (`models/blockModel.js`)**

- **Purpose**: Mongoose schema for MongoDB persistence
- **Database**: Stores complete blockchain in MongoDB
- **Why MongoDB?**: Persistent storage of in-memory blockchain

**Schema Structure**:

````javascript
{
  index: Number,           // Block position in chain
  timestamp: Number,       // Unix timestamp
  data: Object,           // Evidence data (photoHash, lat, lng, etc.)
  previousHash: String,   // Hash of previous block
  hash: String,           // This block's hash (after mining)
  nonce: Number          // PoW nonce value
}
```6n-memory Blockchain**: Fast validation, chain logic
- **MongoDB BlockModel**: Persistent storage, queryable history

### 5
### 3. Utilities

#### **Image Normalization (`utils/normalizeImage.js`)**
- **Library**: Sharp
- **Process**:
  - Resize to 1024x1024 (fit inside)
  - Convert to JPEG (quality 100, mozjpeg)
  - Return buffer
- **Purpose**: Ensure consistent hashing regardless of original format

#### **Image Hashing (`utils/hashImage.js`)**
- **Algorithm**: SHA-256
- **Input**: Image buffer + latitude + longitude + timestamp
- **Output**: 64-character hex hash
- **Purpose**: Create unique, tamper-evident fingerprint

### 4. Database

#### **Block Model (`models/blockModel.js`)**
- **Database**: MongoDB with Mongoose
- **Schema**: Stores complete block structure
- **Connection**: `mongodb://localhost:27017/verity`

### 5. Server (`server.js`)

**Configuration**:
- Port: `5000`
- Middleware: `express.json()`
- Routes: `/api/evidence/*`

**Features**:
- MongoDB connection with error handling
- Express REST API
- CORS-ready (can be configured)
 (for JSON parsing)
- Database: `mongodb://localhost:27017/verity`
- Routes: `/api/evidence/*` (mounted from evidenceRoutes)

**Features**:
- MongoDB connection with event handlers
- Express REST API server
- Route mounting
- Error logging MongoDB ODM
  "multer": "^2.0.2",         // File upload handling
  "sharp": "^0.34.5",         // Image processing
  "crypto": "^1.0.1"          // SHA-256 hashing
}
````

## Running the Backend

### Installation

```bash
cd backend
npm install
```

### Start Server

```bash
npm start
```

Server runs on `http://localhost:5000`

### MongoDB Setup

Ensure MongoDB is running on `mongodb://localhost:27017/verity`

## API Endpoints

### Upload Evidence

```
POST /api/evidence/upload
Content-Type: multipart/form-data

Fields:
- file: Image file
- latitude: GPS latitude
- longitude: GPS longitude
- timestamp: ISO timestamp string
```

### Verify Evidence

```
POST /api/evidence/verify
Content-Type: multipart/form-data

Fields:
- file: Image file to verify
- latitude: GPS latitude
- longitude: GPS longitude
- timestamp: ISO timestamp string
```

## Security Considerations

- **Hash Integrity**: SHA-256 ensures cryptographic security
- **Metadata Binding**: Location and time are part of hash
- **Proof-of-Work**: Mining prevents rapid chain manipulation
- **Chain Validation**: Regular integrity checks
- **Image Normalization**: Prevents trivial alterations from evading detection

## Design Decisions

1. **Why Custom Blockchain?**

   - Full control over validation logic
   - Lightweight for single-server deployment

2. **Why Dual Storage (In-memory + MongoDB)?**

   - **In-memory Blockchain**: Fast chain operations, validation logic
   - **MongoDB**: Persistent storage survives server restarts
   - **Trade-off**: In-memory chain resets on restart (loaded from DB)

3. **Why Normalize Images?**

   - Consistent hashing across devices and formats
   - Prevent compression/resize-based evasion
   - Standardized 1024x1024 JPEG format

4. **Why PoW Mining?**

   - Adds computational cost to chain tampering
   - Industry-standard blockchain security
   - Difficulty level 3 (adjustable)

5. **Why Multer Memory Storage?**

   - Direct buffer access (no disk writes)
   - Processed with Sharp immediately
   - No cleanup of temporary files needed

6. **Why Query MongoDB Instead of In-Memory Chain?**
   - Persistent verification across server restarts
   - Scalable to large datasets
   - Indexed queries on `data.photoHash`st to tampering
   - Industry-standard blockchain security
   - Adjustable difficulty

## Known Limitations

- **Video Support**: Frontend handles video by extracting frames
- **Chain Storage**: Stored in MongoDB (not distributed)
- **Scalability**: Single-server implementation
- **CORS**: May need configuration for production

## Future Improvements

- [ ] Distributed blockchain nodes
- [ ] WebSocket for real-time updates
- [ ] Advanced cryptographic signatures
- [ ] Batch verification endpoints
- [ ] Chain pruning/archival

---

[View Frontend Documentation](../frontend/README.md) | [Back to Main](../README.md)
