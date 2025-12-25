# Supabase Migrations - Database Schema

[← Back to Main Documentation](../../README.md)

## Overview

This directory contains Supabase database migrations for the Factum/Verity project. These SQL scripts set up the PostgreSQL database schema, Row-Level Security (RLS) policies, and Supabase Storage configuration.

## Architecture

```
supabase/migrations/
├── 001_create_media_table.sql    # Main media table & policies
├── 002_update_bucket_types.sql   # Storage bucket configuration
└── README.md                      # This file
```

## Migration Files

### **001_create_media_table.sql**

**Purpose**: Initialize the core media table and security policies

#### Media Table Schema

```sql
public.media
├── id                  UUID (PRIMARY KEY, auto-generated)
├── type                TEXT ('photo' | 'video')
├── timestamp           TIMESTAMP WITH TIME ZONE
├── verified            BOOLEAN (default: false)
├── location            TEXT
├── user_id             TEXT
├── storage_path        TEXT
├── metadata            JSONB
├── created_at          TIMESTAMP WITH TIME ZONE (auto)
└── updated_at          TIMESTAMP WITH TIME ZONE (auto)
```

**Indexes**:

- `idx_media_user_id`: Fast user-based queries
- `idx_media_created_at`: Sorted retrieval (DESC)

#### Row-Level Security (RLS) Policies

**1. SELECT Policy**: "Users can view their own media"

```sql
USING (auth.uid()::text = user_id OR user_id = 'guest')
```

- Users see only their own media
- Guest users can access guest media

**2. INSERT Policy**: "Users can insert their own media"

```sql
WITH CHECK (auth.uid()::text = user_id OR user_id = 'guest')
```

- Users can only create records for themselves
- Allows guest uploads

**3. DELETE Policy**: "Users can delete their own media"

```sql
USING (auth.uid()::text = user_id OR user_id = 'guest')
```

- Users can only delete their own media
- Guest users can delete guest media

#### Storage Bucket Setup

**Bucket**: `media`

- **Public**: `true` (publicly readable URLs)
- **Purpose**: Store photo and video files

**Storage Policies**:

1. **Upload Policy**: "Users can upload their own media"

   ```sql
   bucket_id = 'media' AND
   (auth.uid()::text = (storage.foldername(name))[1] OR
    (storage.foldername(name))[1] = 'guest')
   ```

   - Files stored in user-specific folders
   - Format: `media/{user_id}/filename.jpg`

2. **Read Policy**: "Media is publicly accessible"

   ```sql
   bucket_id = 'media'
   ```

   - All media files are publicly readable
   - Supports direct URL access

3. **Delete Policy**: "Users can delete their own media"
   ```sql
   bucket_id = 'media' AND
   (auth.uid()::text = (storage.foldername(name))[1] OR
    (storage.foldername(name))[1] = 'guest')
   ```
   - Users can only delete from their folder

### **002_update_bucket_types.sql**

**Purpose**: Configure storage bucket accepted file types

**Details**: (Migration content would update allowed MIME types for uploads)

## Key Concepts

### **JSONB Metadata Field**

The `metadata` column stores flexible JSON data:

```json
{
  "hash": "sha256_hash_string",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "device": "iPhone 14",
  "blockchainTxId": "block_hash",
  "blockchainBlock": 42,
  "blockchainTimestamp": "2024-01-01T00:00:00Z",
  "verificationStatus": "verified",

  // Video-specific fields
  "videoFrameCount": 10,
  "videoFrameTimesSec": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  "videoFrameTimestamps": ["2024-01-01T00:00:00Z", ...],
  "videoFrameHashes": ["hash1", "hash2", ...],
  "videoFrameBlockIndices": [1, 2, 3, ...],
  "videoVerifiedFrameCount": 10,
  "videoFailedFrameIndices": []
}
```

### **User ID Handling**

- **Authenticated Users**: `user_id = auth.uid()::text`
- **Guest Users**: `user_id = 'guest'`
- **Flexibility**: Supports both modes seamlessly

### **Storage Structure**

```
media/
├── {user_id_1}/
│   ├── photo_123456.jpg
│   ├── video_789012.mp4
│   └── ...
├── {user_id_2}/
│   └── ...
└── guest/
    ├── photo_guest_1.jpg
    └── ...
```

## Running Migrations

### **Option 1: Supabase CLI**

```bash
# Initialize Supabase
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### **Option 2: Supabase Dashboard**

1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy contents of `001_create_media_table.sql`
4. Execute
5. Repeat for `002_update_bucket_types.sql`

### **Option 3: Manual psql**

```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f 001_create_media_table.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f 002_update_bucket_types.sql
```

## Security Considerations

### **Row-Level Security (RLS)**

- ✅ **Enabled** on `public.media`
- ✅ Prevents unauthorized data access
- ✅ Enforced at database level
- ✅ Works with Supabase Auth

### **Storage Security**

- ✅ User-folder isolation
- ✅ Public read access (for sharing verified media)
- ✅ Authenticated write/delete
- ✅ Guest mode support

### **Best Practices**

1. **Never disable RLS** on production tables
2. **Always use parameterized queries** in application code
3. **Validate file types** before upload
4. **Set file size limits** in Supabase dashboard
5. **Monitor storage usage** regularly

## Database Queries

### Get User Media

```sql
SELECT * FROM public.media
WHERE user_id = auth.uid()::text
ORDER BY created_at DESC;
```

### Check Verified Media

```sql
SELECT * FROM public.media
WHERE user_id = auth.uid()::text
  AND verified = true;
```

### Find Media by Hash

```sql
SELECT * FROM public.media
WHERE metadata->>'hash' = 'target_hash';
```

### Get Video Frame Metadata

```sql
SELECT
  metadata->'videoFrameCount' as frame_count,
  metadata->'videoVerifiedFrameCount' as verified_count
FROM public.media
WHERE type = 'video';
```

## Schema Versioning

**Migration Naming Convention**:

```
{number}_{description}.sql
```

**Examples**:

- `001_create_media_table.sql` - Initial schema
- `002_update_bucket_types.sql` - Storage config
- `003_add_sharing_table.sql` - Future enhancement

**Migration Guidelines**:

1. Never modify existing migrations
2. Create new migration for schema changes
3. Include rollback SQL in comments
4. Test on staging before production
5. Document breaking changes

## Troubleshooting

### **RLS Policy Errors**

**Problem**: "new row violates row-level security policy"

**Solution**: Verify user is authenticated or use guest mode

```typescript
// Frontend: Ensure user_id matches
const userId = user?.id || "guest";
```

### **Storage Upload Fails**

**Problem**: "new row violates policy"

**Solution**: Check folder structure matches user ID

```typescript
// Correct path format
const filePath = `${userId}/photo_${Date.now()}.jpg`;
```

### **Migration Conflicts**

**Problem**: Migration already applied

**Solution**: Check migration status

```bash
supabase migration list
```

## Future Migrations

Potential schema enhancements:

- [ ] `003_add_sharing_table.sql` - Social sharing features
- [ ] `004_add_comments_table.sql` - Media comments
- [ ] `005_add_reports_table.sql` - Abuse reporting
- [ ] `006_add_analytics_table.sql` - Usage tracking
- [ ] `007_add_collaborators_table.sql` - Multi-user verification

## Metadata Evolution

**Current Version**: v1 (JSONB flexible schema)

**Advantages**:

- No schema migrations for new fields
- Supports video and photo in one table
- Easy to extend

**Trade-offs**:

- Less strict typing
- Requires application-level validation
- Indexing JSONB is slower than columns

**Future Consideration**: Migrate to dedicated columns for frequently queried fields

---

**Database**: Supabase PostgreSQL  
**ORM**: Supabase JS Client (no traditional ORM)  
**Security**: Row-Level Security (RLS)

[View Frontend Documentation](../../frontend/README.md) | [View Backend Documentation](../../backend/README.md) | [Back to Main](../../README.md)
