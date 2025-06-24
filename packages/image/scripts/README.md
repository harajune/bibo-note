# Image Upload Test Script

This script tests the presigned URL image upload functionality of the bibo-note image service.

## Features

- **Presigned URL Upload**: Uses the secure presigned URL approach instead of direct upload
- **Multiple Image Support**: Can upload all images in a directory or specific images
- **Verification**: Automatically verifies uploaded images by accessing the view URL
- **JSON Parsing**: Uses `jq` for robust JSON parsing when available
- **Fallback Support**: Works with basic shell tools when `jq` is not available
- **Test Image Generation**: Can create test images using ImageMagick

## Prerequisites

- Development server running at `https://harajune.bibo-note.dev`
- `curl` for HTTP requests
- `jq` (optional, for better JSON parsing)
- `ImageMagick` (optional, for test image generation)

## Usage

### Basic Commands

```bash
# Upload all images from the test-images directory
./upload-test.sh

# Upload all images (explicit)
./upload-test.sh all

# Test presigned URL functionality
./upload-test.sh test

# Upload a specific image
./upload-test.sh ./path/to/image.jpg

# Show help
./upload-test.sh help
```

### Setup

1. **Create test images directory**:
   ```bash
   mkdir -p ./test-images
   ```

2. **Add test images** (optional):
   ```bash
   # Copy your test images to the directory
   cp /path/to/your/images/* ./test-images/
   ```

3. **Install optional dependencies**:
   ```bash
   # Install jq for better JSON parsing (macOS)
   brew install jq
   
   # Install ImageMagick for test image generation (macOS)
   brew install imagemagick
   ```

## How It Works

1. **Get Presigned URL**: The script first calls the `/image/uploadurl` endpoint to get a presigned URL
2. **Parse Response**: Extracts UUID, upload URL, view URL, and required fields from the JSON response
3. **Upload File**: Uses the presigned URL to upload the image file with required fields
4. **Verify Upload**: Attempts to access the view URL to verify the upload was successful

## API Endpoints Used

- `GET /image/uploadurl` - Generate presigned URL for upload
- `GET /image/view/:uuid` - View uploaded image (for verification)

## Response Format

The presigned URL endpoint returns:
```json
{
  "success": true,
  "uuid": "generated-uuid",
  "uploadUrl": "presigned-upload-url",
  "fields": {
    "key": "value",
    "policy": "...",
    "signature": "..."
  },
  "viewUrl": "/image/view/uuid"
}
```

## Error Handling

The script handles various error scenarios:
- Development server not running
- Invalid image files
- Upload failures
- Verification failures
- JSON parsing errors

## Troubleshooting

### Common Issues

1. **"Development server is not running"**
   - Start the development server: `pnpm dev`

2. **"jq not found"**
   - Install jq or the script will use fallback parsing

3. **"ImageMagick not found"**
   - Install ImageMagick or manually add test images

4. **Upload failures**
   - Check server logs for detailed error messages
   - Verify authentication credentials
   - Ensure image file is valid

### Debug Mode

To see more detailed output, the script uses verbose curl commands (`-v` flag) which will show:
- HTTP request/response headers
- Upload progress
- Detailed error messages

## Security Notes

- The script uses basic authentication with hardcoded credentials
- Presigned URLs provide secure, time-limited upload access
- No credentials are sent with the actual file upload
- All uploads are verified before considering them successful 