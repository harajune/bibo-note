# Image Upload API

This package provides image upload and viewing functionality for the application, deployed as a Lambda function behind CloudFront.

## Features

- **Image Upload**: Convert and store images as PNG format in S3
- **Image Viewing**: Serve images with proper caching headers
- **Multi-tenant**: User-based image isolation using subdomain detection
- **Image Processing**: Automatic conversion to PNG using Sharp library

## API Endpoints

### Upload Images
**POST** `/image/upload`

Uploads an image file and returns a UUID and URL for accessing it.

#### Request
- Content-Type: `multipart/form-data`
- Field name: `image`
- Supported formats: Any format supported by Sharp (JPEG, PNG, WebP, etc.)

#### Response
```json
{
  "success": true,
  "uuid": "01234567-89ab-cdef-0123-456789abcdef",
  "url": "/image/view/01234567-89ab-cdef-0123-456789abcdef"
}
```

#### Example using curl
```bash
curl -X POST "https://subdomain.example.com/image/upload" \
  -F "image=@/path/to/your/image.jpg"
```

### View Images
**GET** `/image/view/{uuid}`

Retrieves and displays an image by its UUID.

#### Response
- Content-Type: `image/png`
- Cache-Control: `public, max-age=31536000` (1 year)

#### Example
```
GET https://subdomain.example.com/image/view/01234567-89ab-cdef-0123-456789abcdef
```

## Storage Structure

Images are stored in S3 with the following structure:
```
bucket-name/
├── user1/
│   └── images/
│       ├── uuid1.png
│       └── uuid2.png
└── user2/
    └── images/
        ├── uuid3.png
        └── uuid4.png
```

## User Identification

Users are identified by the subdomain of the request:
- `user1.example.com` → User: `user1`
- `user2.example.com` → User: `user2`

## Image Processing

- All uploaded images are converted to PNG format
- Quality: 90% with compression level 6
- Original format is not preserved

## Development

### Build
```bash
pnpm build
```

### Test
```bash
pnpm test
```

### Development Server
```bash
pnpm dev
```

## Environment Variables

The following environment variables are required:

- `WIKI_BUCKET_NAME`: S3 bucket name for storing images
- `AWS_REGION`: AWS region
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_SESSION_TOKEN`: AWS session token (if using temporary credentials)
- `MULTITENANT`: Set to "1" to enable multi-tenant mode
- `MODE`: Environment mode (development/production)

## Error Handling

### Upload Errors
- `400`: No image file provided
- `500`: Failed to process or upload image

### View Errors
- `400`: UUID parameter is required
- `404`: Image not found
- `500`: Internal server error

## Dependencies

- **hono**: Web framework for handling HTTP requests
- **sharp**: High-performance image processing
- **@aws-sdk/client-s3**: AWS S3 client for storage operations
- **uuid**: UUID v7 generation for unique image identifiers