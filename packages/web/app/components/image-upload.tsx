import { useState } from 'hono/jsx'
import { uploadImageWithPresignedUrl, ImageUploadResult } from '../utils/image-upload'

interface ImageUploadProps {
  onImageUploaded?: (result: ImageUploadResult) => void
}

export function ImageUpload({ onImageUploaded }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<ImageUploadResult | null>(null)

  const handleFileSelect = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (!file) {
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const result = await uploadImageWithPresignedUrl(file)
      setUploadResult(result)
      
      if (result.success && onImageUploaded) {
        onImageUploaded(result)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        uuid: '',
        imageUrl: '',
        error: 'Upload failed'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const insertImageMarkdown = () => {
    if (uploadResult?.success) {
      const markdown = `![Image](${uploadResult.imageUrl})`
      
      // Try to insert into the content textarea
      const contentTextarea = document.getElementById('content') as HTMLTextAreaElement
      if (contentTextarea) {
        const start = contentTextarea.selectionStart
        const end = contentTextarea.selectionEnd
        const text = contentTextarea.value
        
        const before = text.substring(0, start)
        const after = text.substring(end)
        
        contentTextarea.value = before + markdown + after
        contentTextarea.selectionStart = contentTextarea.selectionEnd = start + markdown.length
        contentTextarea.focus()
      }
    }
  }

  return (
    <div class="flex items-center space-x-2">
      <label 
        class={`inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 cursor-pointer ${
          isUploading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {isUploading ? 'Uploading...' : 'Upload Image'}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          class="sr-only"
        />
      </label>

      {uploadResult && (
        <div class="flex items-center space-x-2">
          {uploadResult.success ? (
            <>
              <span class="text-sm text-green-600">✓ Uploaded</span>
              <button
                type="button"
                onClick={insertImageMarkdown}
                class="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Insert into content
              </button>
            </>
          ) : (
            <span class="text-sm text-red-600">
              ✗ {uploadResult.error || 'Upload failed'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}