import { ImageResponse } from '@vercel/og';
import React from 'react';

export const handler = async (event: any): Promise<any> => {
  try {
    const { queryStringParameters } = event;
    const title = queryStringParameters?.title || 'Untitled Article';
    
    const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;

    const imageResponse = new ImageResponse(
      React.createElement('div', {
        style: {
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          fontSize: 48,
          fontWeight: 'bold',
          color: '#333333',
          fontFamily: '"Hiragino Sans", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", Arial, sans-serif'
        }
      }, React.createElement('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          maxWidth: '90%',
          lineHeight: 1.2
        }
      }, displayTitle)),
      {
        width: 1200,
        height: 630
      }
    );

    const buffer = await imageResponse.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('OGP generation error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Failed to generate OGP image' })
    };
  }
};
