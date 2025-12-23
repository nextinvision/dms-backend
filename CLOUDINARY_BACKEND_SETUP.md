# Cloudinary Backend Integration - Setup Guide

## ✅ Completed Changes

### 1. Prisma Schema Updated
- File model now includes:
  - `publicId` (unique) - Cloudinary public ID for deletion
  - `format` - File format (jpg, png, pdf, mp4, etc.)
  - `bytes` - File size in bytes
  - `width`, `height` - Image dimensions (optional)
  - `duration` - Video duration (optional)
  - `uploadedBy` - User ID who uploaded
  - `metadata` - Additional Cloudinary metadata (JSON)
  - Indexes added for performance

### 2. Files Module Created
- **Controller**: `src/modules/files/files.controller.ts`
  - `POST /api/files` - Create file metadata
  - `POST /api/files/bulk` - Create multiple files
  - `GET /api/files?entityType=appointment&entityId=xxx` - Get files
  - `GET /api/files/:id` - Get file by ID
  - `DELETE /api/files/:id` - Delete file (Cloudinary + DB)
  - `DELETE /api/files/entity/:entityType/:entityId` - Delete all files for entity
  - `DELETE /api/files/category/:entityType/:entityId/:category` - Delete files by category

- **Service**: `src/modules/files/files.service.ts`
  - Handles file metadata CRUD operations
  - Integrates with Cloudinary SDK for deletion
  - Supports bulk operations

- **DTOs**: `src/modules/files/dto/create-file.dto.ts`
  - `CreateFileDto` - File metadata structure
  - `FileCategory` enum - All file categories
  - `RelatedEntityType` enum - Entity types

### 3. Appointments Module Updated
- DTO now accepts `documentationFiles` with Cloudinary metadata
- Service automatically saves file metadata to File table
- `findOne` now includes associated files

### 4. Job Cards Module Updated
- DTO now accepts `part2AData.files` with warranty documentation
- Service automatically saves file metadata to File table
- `findOne` now includes associated files

### 5. Environment Variables Added
Added to `env.example`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=dms-unsigned-upload
```

### 6. Dependencies Installed
- `cloudinary` package added to `package.json`

## 🔧 Required Next Steps

### 1. Add Cloudinary Credentials to `.env`
Copy the following to your `.env` file:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=dms-unsigned-upload
```

Get these from: https://cloudinary.com/console

### 2. Run Prisma Migration
```bash
cd dms-backend
npx prisma migrate dev --name add_cloudinary_file_fields
```

This will:
- Update the File table schema
- Add new columns and indexes
- Generate Prisma Client

### 3. Update Frontend to Send File Metadata

After Cloudinary upload, frontend should call:

```typescript
// Example: After uploading appointment files
const uploadResults = await uploadMultiple(files, folder, options);

// Send metadata to backend
await fetch('/api/files/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify(
    uploadResults.map(result => ({
      url: result.secureUrl,
      publicId: result.publicId,
      filename: file.name,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
      category: FileCategory.CUSTOMER_ID_PROOF, // or appropriate category
      relatedEntityId: appointmentId,
      relatedEntityType: RelatedEntityType.APPOINTMENT,
      uploadedBy: userId,
    }))
  ),
});
```

### 4. API Endpoints Available

#### Get Files for an Entity
```bash
GET /api/files?entityType=appointment&entityId={id}
GET /api/files?entityType=job_card&entityId={id}&category=warranty_video
```

#### Create File Metadata
```bash
POST /api/files
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "https://res.cloudinary.com/...",
  "publicId": "folder/public_id",
  "filename": "document.pdf",
  "format": "pdf",
  "bytes": 1024000,
  "category": "customer_id_proof",
  "relatedEntityId": "uuid",
  "relatedEntityType": "appointment",
  "uploadedBy": "user-uuid"
}
```

#### Delete File
```bash
DELETE /api/files/{fileId}
```
This deletes from both Cloudinary and database.

## 📋 File Categories

- `customer_id_proof` - Customer ID documents
- `vehicle_rc` - Vehicle RC copy
- `warranty_card` - Warranty card/service book
- `photos_videos` - General photos/videos
- `warranty_video` - Warranty video evidence
- `warranty_vin` - VIN/chassis images
- `warranty_odo` - Odometer images
- `warranty_damage` - Damage images
- `vehicle_condition` - Vehicle condition images
- `vehicle_photos` - Vehicle photos

## 🔍 Testing

1. **Test File Creation**:
   ```bash
   curl -X POST http://localhost:4000/api/files \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "url": "https://res.cloudinary.com/test/image/upload/test.jpg",
       "publicId": "test/test",
       "filename": "test.jpg",
       "format": "jpg",
       "bytes": 1024,
       "category": "customer_id_proof",
       "relatedEntityId": "test-id",
       "relatedEntityType": "appointment"
     }'
   ```

2. **Test File Retrieval**:
   ```bash
   curl http://localhost:4000/api/files?entityType=appointment&entityId=test-id \
     -H "Authorization: Bearer {token}"
   ```

3. **Test File Deletion**:
   ```bash
   curl -X DELETE http://localhost:4000/api/files/{fileId} \
     -H "Authorization: Bearer {token}"
   ```

## ⚠️ Important Notes

1. **Cloudinary Credentials**: Required for file deletion. Frontend uploads work without backend credentials, but deletion requires them.

2. **File Metadata**: Always send file metadata to backend after successful Cloudinary upload to enable:
   - File retrieval by entity
   - File deletion
   - File organization and search

3. **Error Handling**: If Cloudinary deletion fails, the database record is still deleted. Check logs for Cloudinary errors.

4. **Bulk Operations**: Use `/api/files/bulk` endpoint for multiple files to reduce API calls.

## 🎯 Integration Status

- ✅ Backend schema updated
- ✅ Files module created
- ✅ Appointments integration
- ✅ Job Cards integration
- ✅ Cloudinary SDK installed
- ⏳ Prisma migration pending
- ⏳ Frontend integration pending (send metadata after upload)

