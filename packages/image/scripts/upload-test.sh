#!/bin/bash

# Image Upload Test Script using Presigned URLs
# This script uploads images using the presigned URL functionality

# Configuration
DEV_SERVER_URL="https://harajune.bibo-note.dev"
PRESIGNED_ENDPOINT="/image/uploadurl"
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

# Function to get presigned URL
get_presigned_url() {
    local image_path="$1"
    local image_name=$(basename "$image_path")
    
    print_status "Getting presigned URL for $image_name..."
    
    # Get presigned URL from the server
    response=$(curl -s -X GET \
        "$DEV_SERVER_URL$PRESIGNED_ENDPOINT" \
        -H "Content-Type: application/json" \
        -u harajune:bxE-PPf8iV@-MZb8i@B.)
    
    # Check if presigned URL generation was successful
    if echo "$response" | grep -q '"success":true'; then
        # Extract data from response using jq if available, otherwise use grep/sed
        if command -v jq >/dev/null 2>&1; then
            uuid=$(echo "$response" | jq -r '.uuid')
            upload_url=$(echo "$response" | jq -r '.uploadUrl')
            view_url=$(echo "$response" | jq -r '.viewUrl')
            fields_json=$(echo "$response" | jq -r '.fields')
        else
            # Fallback to grep/sed extraction
            uuid=$(echo "$response" | grep -o '"uuid":"[^"]*"' | cut -d'"' -f4)
            upload_url=$(echo "$response" | grep -o '"uploadUrl":"[^"]*"' | cut -d'"' -f4)
            view_url=$(echo "$response" | grep -o '"viewUrl":"[^"]*"' | cut -d'"' -f4)
            fields_json=$(echo "$response" | sed -n 's/.*"fields":{\([^}]*\)}.*/\1/p')
        fi
        
        print_success "Presigned URL generated for $image_name"
        echo "  UUID: $uuid"
        echo "  Upload URL: $upload_url"
        echo "  View URL: $view_url"
        echo "  Fields: $fields_json"
        
        # Return the data
        echo "$uuid|$upload_url|$view_url|$fields_json"
        return 0
    else
        print_error "Failed to get presigned URL for $image_name"
        echo "  Response: $response"
        return 1
    fi
}

# Function to verify uploaded image
verify_uploaded_image() {
    local view_url="$1"
    local image_name="$2"
    
    print_status "Verifying uploaded image: $image_name"
    
    # Try to access the view URL
    verify_response=$(curl -s -I "$DEV_SERVER_URL$view_url" -u harajune:bxE-PPf8iV@-MZb8i@B.)
    
    if echo "$verify_response" | grep -q "200 OK"; then
        print_success "Image verification successful for $image_name"
        echo "  View URL: $DEV_SERVER_URL$view_url"
        return 0
    else
        print_warning "Image verification failed for $image_name"
        echo "  Response: $verify_response"
        return 1
    fi
}

# Function to upload using presigned URL
upload_with_presigned_url() {
    local image_path="$1"
    local presigned_data="$2"
    local image_name=$(basename "$image_path")
    
    # Parse presigned data
    IFS='|' read -r uuid upload_url view_url fields_json <<< "$presigned_data"
    
    print_status "Uploading $image_name using presigned URL..."
    
    # Build the upload command with fields
    upload_cmd="curl -v -s -X POST"
    
    # Add the file
    upload_cmd="$upload_cmd -F 'file=@$image_path'"
    
    # Add fields if they exist and are not empty
    if [ -n "$fields_json" ] && [ "$fields_json" != "{}" ]; then
        # Use jq to parse JSON fields if available, otherwise use sed
        if command -v jq >/dev/null 2>&1; then
            # Use jq for proper JSON parsing
            while IFS='=' read -r key value; do
                if [ -n "$key" ] && [ -n "$value" ]; then
                    upload_cmd="$upload_cmd -F '$key=$value'"
                fi
            done < <(echo "$fields_json" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"')
        else
            # Fallback to sed parsing (simplified)
            print_warning "jq not found, using simplified field parsing"
            # Remove quotes and braces, then split by comma
            clean_fields=$(echo "$fields_json" | sed 's/["{}]//g' | sed 's/,/\n/g')
            echo "$clean_fields" | while IFS=':' read -r key value; do
                if [ -n "$key" ] && [ -n "$value" ]; then
                    # Clean up whitespace
                    clean_key=$(echo "$key" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
                    clean_value=$(echo "$value" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
                    if [ -n "$clean_key" ] && [ -n "$clean_value" ]; then
                        upload_cmd="$upload_cmd -F '$clean_key=$clean_value'"
                    fi
                fi
            done
        fi
    fi
    
    # Add the upload URL
    upload_cmd="$upload_cmd '$upload_url'"
    
    print_status "Executing upload command..."
    echo "  Command: $upload_cmd"
    
    # Execute the upload
    upload_response=$(eval $upload_cmd)
    
    # Check upload result
    if [ $? -eq 0 ]; then
        print_success "Upload successful for $image_name"
        echo "  UUID: $uuid"
        echo "  View URL: $DEV_SERVER_URL$view_url"
        echo "  Upload Response: $upload_response"
        
        # Verify the uploaded image
        verify_uploaded_image "$view_url" "$image_name"
        
        echo ""
        return 0
    else
        print_error "Upload failed for $image_name"
        echo "  Upload Response: $upload_response"
        echo ""
        return 1
    fi
}

# Function to upload a single image using presigned URL
upload_image() {
    local image_path="$1"
    local image_name=$(basename "$image_path")
    
    print_status "Processing $image_name..."
    
    # Step 1: Get presigned URL
    presigned_data=$(get_presigned_url "$image_path")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Step 2: Upload using presigned URL
    upload_with_presigned_url "$image_path" "$presigned_data"
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

# Function to test presigned URL functionality
test_presigned_url() {
    print_status "Testing presigned URL functionality..."
    
    # Create a test image if none exists
    if [ ! -d "$IMAGES_DIR" ] || [ -z "$(find "$IMAGES_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" \) 2>/dev/null)" ]; then
        print_warning "No test images found. Creating a test image..."
        mkdir -p "$IMAGES_DIR"
        
        # Create a simple test image using ImageMagick or similar
        if command -v convert >/dev/null 2>&1; then
            convert -size 100x100 xc:red "$IMAGES_DIR/test.png"
            print_success "Created test image: $IMAGES_DIR/test.png"
        else
            print_error "ImageMagick not found. Please install it or add some test images to $IMAGES_DIR"
            return 1
        fi
    fi
    
    # Test with the first available image
    local test_image=$(find "$IMAGES_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" \) | head -1)
    
    if [ -n "$test_image" ]; then
        print_status "Testing with: $test_image"
        upload_image "$test_image"
    else
        print_error "No test images available"
        return 1
    fi
}

# Main script logic
main() {
    echo "=========================================="
    echo "    Presigned URL Image Upload Test"
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
        "test")
            test_presigned_url
            ;;
        "help"|"-h"|"--help")
            echo "Usage: $0 [COMMAND] [IMAGE_PATH]"
            echo ""
            echo "Commands:"
            echo "  all                    Upload all images from $IMAGES_DIR"
            echo "  test                   Test presigned URL functionality"
            echo "  <image_path>           Upload a specific image file"
            echo "  help, -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                     Upload all images from $IMAGES_DIR"
            echo "  $0 all                 Upload all images from $IMAGES_DIR"
            echo "  $0 test                Test presigned URL functionality"
            echo "  $0 ./test.jpg          Upload specific image file"
            echo "  $0 help                Show this help message"
            echo ""
            echo "Note: This script uses presigned URLs for secure uploads."
            ;;
        *)
            # Treat as specific image path
            upload_specific_image "$1"
            ;;
    esac
}

# Run main function with all arguments
main "$@" 