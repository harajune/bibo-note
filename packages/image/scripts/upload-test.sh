#!/bin/bash

# Image Upload Test Script
# This script uploads images to the local development server

# Configuration
DEV_SERVER_URL="https://harajune.bibo-note.dev"
UPLOAD_ENDPOINT="/image/upload"
IMAGES_DIR="./test-images"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if dev server is running
check_dev_server() {
    print_status "Checking if development server is running..."
    
    if curl -s --head "$DEV_SERVER_URL/ping" > /dev/null 2>&1; then
        print_success "Development server is running at $DEV_SERVER_URL"
        return 0
    else
        print_error "Development server is not running at $DEV_SERVER_URL"
        print_status "Please start the development server with: pnpm dev"
        return 1
    fi
}

# Function to upload a single image
upload_image() {
    local image_path="$1"
    local image_name=$(basename "$image_path")
    
    print_status "Uploading $image_name..."
    
    # Upload the image using curl
    response=$(curl -v -s -X POST \
        -F "image=@$image_path" \
        "$DEV_SERVER_URL$UPLOAD_ENDPOINT" \
        -H "Content-Type: multipart/form-data" \
        -u harajune:bxE-PPf8iV@-MZb8i@B.)
    
    # Check if upload was successful
    if echo "$response" | grep -q '"success":true'; then
        # Extract UUID and URL from response
        uuid=$(echo "$response" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
        url=$(echo "$response" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)
        
        print_success "Upload successful for $image_name"
        echo "  UUID: $uuid"
        echo "  URL: $url"
        echo "  Response: $response"
        echo ""
        return 0
    else
        print_error "Upload failed for $image_name"
        echo "  Response: $response"
        echo ""
        return 1
    fi
}

# Function to upload all images in a directory
upload_all_images() {
    local images_dir="$1"
    
    if [ ! -d "$images_dir" ]; then
        print_error "Images directory '$images_dir' does not exist"
        return 1
    fi
    
    # Find all image files
    local image_files=($(find "$images_dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" \)))
    
    if [ ${#image_files[@]} -eq 0 ]; then
        print_warning "No image files found in '$images_dir'"
        print_status "Supported formats: jpg, jpeg, png, gif, webp"
        return 1
    fi
    
    print_status "Found ${#image_files[@]} image(s) to upload"
    
    local success_count=0
    local total_count=${#image_files[@]}
    
    for image_file in "${image_files[@]}"; do
        if upload_image "$image_file"; then
            ((success_count++))
        fi
    done
    
    print_status "Upload completed: $success_count/$total_count successful"
    
    if [ $success_count -eq $total_count ]; then
        print_success "All images uploaded successfully!"
    else
        print_warning "Some uploads failed. Check the output above for details."
    fi
}

# Function to upload a specific image
upload_specific_image() {
    local image_path="$1"
    
    if [ ! -f "$image_path" ]; then
        print_error "Image file '$image_path' does not exist"
        return 1
    fi
    
    upload_image "$image_path"
}

# Main script logic
main() {
    echo "=========================================="
    echo "    Image Upload Test Script"
    echo "=========================================="
    echo ""
    
    # Check if dev server is running
    if ! check_dev_server; then
        exit 1
    fi
    
    # Parse command line arguments
    case "$1" in
        "all"|"")
            print_status "Uploading all images from $IMAGES_DIR"
            upload_all_images "$IMAGES_DIR"
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [COMMAND] [IMAGE_PATH]"
            echo ""
            echo "Commands:"
            echo "  all                    Upload all images from $IMAGES_DIR"
            echo "  <image_path>           Upload a specific image file"
            echo "  help, -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                     Upload all images from $IMAGES_DIR"
            echo "  $0 all                 Upload all images from $IMAGES_DIR"
            echo "  $0 ./test.jpg          Upload specific image file"
            echo "  $0 help                Show this help message"
            ;;
        *)
            # Treat as specific image path
            upload_specific_image "$1"
            ;;
    esac
}

# Run main function with all arguments
main "$@" 