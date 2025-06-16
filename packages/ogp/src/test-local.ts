import { ImageResponse } from '@vercel/og';

async function testOGPGeneration(): Promise<void> {
  const testTitle = "Test Article for OGP Image Generation";
  const testUser = "testuser";
  
  console.log('Testing OGP image generation...');
  console.log(`Title: ${testTitle}`);
  console.log(`User: ${testUser}`);
  
  try {
    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1f2937',
            fontSize: 32,
            fontWeight: 600,
          }}
        >
          <div style={{ color: '#f9fafb', marginBottom: 20, textAlign: 'center', padding: '0 40px' }}>
            {testTitle.length > 80 ? testTitle.substring(0, 80) + '...' : testTitle}
          </div>
          <div style={{ color: '#9ca3af', fontSize: 24 }}>
            by {testUser}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
    
    const buffer = await imageResponse.arrayBuffer();
    console.log(`Generated image buffer size: ${buffer.byteLength} bytes`);
    console.log('OGP image generation test successful!');
    
  } catch (error) {
    console.error('OGP image generation test failed:', error);
    process.exit(1);
  }
}

testOGPGeneration();
