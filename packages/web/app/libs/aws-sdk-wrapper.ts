// AWS SDK wrapper to handle SSR and CommonJS issues
let S3Client: any;
let PutObjectCommand: any;
let GetObjectCommand: any;
let ListObjectsCommand: any;
let HeadObjectCommand: any;
let isLoaded = false;

// Lazy load AWS SDK on first use
async function ensureAwsSdkLoaded() {
  if (isLoaded || typeof window !== 'undefined') {
    return;
  }
  
  try {
    const awsSdk = await import('@aws-sdk/client-s3');
    S3Client = awsSdk.S3Client;
    PutObjectCommand = awsSdk.PutObjectCommand;
    GetObjectCommand = awsSdk.GetObjectCommand;
    ListObjectsCommand = awsSdk.ListObjectsCommand;
    HeadObjectCommand = awsSdk.HeadObjectCommand;
    isLoaded = true;
  } catch (error) {
    console.error('Failed to load AWS SDK:', error);
    throw error;
  }
}

// Export wrapped constructors that ensure SDK is loaded
const getS3Client = async () => {
  await ensureAwsSdkLoaded();
  return S3Client;
};

const getPutObjectCommand = async () => {
  await ensureAwsSdkLoaded();
  return PutObjectCommand;
};

const getGetObjectCommand = async () => {
  await ensureAwsSdkLoaded();
  return GetObjectCommand;
};

const getListObjectsCommand = async () => {
  await ensureAwsSdkLoaded();
  return ListObjectsCommand;
};

const getHeadObjectCommand = async () => {
  await ensureAwsSdkLoaded();
  return HeadObjectCommand;
};

export { 
  getS3Client as S3Client,
  getPutObjectCommand as PutObjectCommand,
  getGetObjectCommand as GetObjectCommand,
  getListObjectsCommand as ListObjectsCommand,
  getHeadObjectCommand as HeadObjectCommand
}; 