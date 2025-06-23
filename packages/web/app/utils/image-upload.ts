export interface PresignedUploadResponse {
  success: boolean
  uuid: string
  uploadUrl: string
  fields: Record<string, string>
  viewUrl: string
}

export interface ImageUploadResult {
  success: boolean
  uuid: string
  imageUrl: string
  error?: string
}

export async function uploadImageWithPresignedUrl(file: File): Promise<ImageUploadResult> {
  try {
    // Step 1: Get presigned URL from our API
    const response = await fetch('/image/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`)
    }

    const presignedData: PresignedUploadResponse = await response.json()

    // Step 2: Upload directly to S3 using presigned URL
    const formData = new FormData()
    
    // Add all the required fields from the presigned response
    Object.entries(presignedData.fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    
    // Add the file last
    formData.append('file', file)

    const uploadResponse = await fetch(presignedData.uploadUrl, {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`)
    }

    // Step 3: Return success with image URL
    return {
      success: true,
      uuid: presignedData.uuid,
      imageUrl: presignedData.viewUrl,
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    return {
      success: false,
      uuid: '',
      imageUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

export async function uploadImageDirect(file: File, uuid: string): Promise<ImageUploadResult> {
  try {
    // For development - direct upload to our endpoint
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`/image/upload-direct/${uuid}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`)
    }

    const result = await response.json() as { success: boolean; uuid: string; url: string }

    return {
      success: result.success,
      uuid: result.uuid,
      imageUrl: result.url,
    }
  } catch (error) {
    console.error('Direct image upload failed:', error)
    return {
      success: false,
      uuid: '',
      imageUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}