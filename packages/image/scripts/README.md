# Image Upload Test Scripts

This directory contains scripts for testing the image upload functionality of the bibo-note image service.

## Files

- `upload-test.sh` - Main script for uploading images to the local development server
- `test-images/` - Directory where you can place test images

## Prerequisites

1. Make sure the development server is running:
   ```bash
   cd packages/image
   pnpm dev
   ```

2. The development server should be running on `http://localhost:5173`

## Usage

### Upload all images from test-images directory

```bash
cd packages/image
./scripts/upload-test.sh
# or
./scripts/upload-test.sh all
```

### Upload a specific image

```bash
cd packages/image
./scripts/upload-test.sh path/to/your/image.jpg
```

### Show help

```bash
cd packages/image
./scripts/upload-test.sh help
```

## Supported Image Formats

The script supports the following image formats:
- JPG/JPEG
- PNG
- GIF
- WebP

## How it works

1. The script first checks if the development server is running by making a request to `/ping`
2. It then uploads images using the `/image/upload` endpoint
3. For each successful upload, it displays:
   - The UUID of the uploaded image
   - The URL where the image can be accessed
   - The full response from the server

## Configuration

You can modify the following variables in the script:
- `DEV_SERVER_URL` - The URL of the development server (default: `http://localhost:5173`)
- `UPLOAD_ENDPOINT` - The upload endpoint (default: `/image/upload`)
- `IMAGES_DIR` - The directory containing test images (default: `./test-images`)

## Example Output

```
==========================================
    Image Upload Test Script
==========================================

[INFO] Checking if development server is running...
[SUCCESS] Development server is running at http://localhost:5173
[INFO] Uploading all images from ./test-images
[INFO] Found 2 image(s) to upload
[INFO] Uploading test-image-1.jpg...
[SUCCESS] Upload successful for test-image-1.jpg
  UUID: 12345678-1234-1234-1234-123456789abc
  URL: http://localhost:5173/image/view/12345678-1234-1234-1234-123456789abc
  Response: {"success":true,"uuid":"12345678-1234-1234-1234-123456789abc","url":"http://localhost:5173/image/view/12345678-1234-1234-1234-123456789abc"}

[INFO] Upload completed: 2/2 successful
[SUCCESS] All images uploaded successfully!
```

## Troubleshooting

### Development server not running
If you see an error that the development server is not running:
1. Make sure you're in the `packages/image` directory
2. Run `pnpm dev` to start the development server
3. Wait for the server to start (you should see output indicating the server is running)
4. Try running the upload script again

### Permission denied
If you get a permission denied error:
```bash
chmod +x scripts/upload-test.sh
```

### No images found
If you get a warning that no images were found:
1. Make sure you have image files in the `test-images` directory
2. Check that the image files have supported extensions (.jpg, .jpeg, .png, .gif, .webp)
3. Make sure the image files are readable 