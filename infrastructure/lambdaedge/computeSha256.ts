import { CloudFrontRequestEvent, CloudFrontRequest } from 'aws-lambda';
import * as crypto from 'crypto';

export const handler = async (event: CloudFrontRequestEvent): Promise<CloudFrontRequest> => {
  const request = event.Records[0].cf.request;
  const method = request.method;

  if (method === 'POST' || method === 'PUT') {
    if (request.body && request.body.data) {
      const data = request.body.data;
      const encoding = request.body.encoding || 'text';
      let payload: string | Buffer;
      if (encoding === 'base64') {
        payload = Buffer.from(data, 'base64');
      } else {
        payload = data;
      }
      const hash = crypto.createHash('sha256');
      hash.update(payload);
      const digest = hash.digest('hex');
      request.headers['x-amz-content-sha256'] = [{ key: 'x-amz-content-sha256', value: digest }];
    }
  }
  return request;
}; 