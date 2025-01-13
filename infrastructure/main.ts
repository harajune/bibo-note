#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CloudFrontEdgeStack } from './cloud-front-edge-stack';

const app = new cdk.App();
new CloudFrontEdgeStack(app, 'CloudFrontEdgeStack', {
  // Lambda@Edge only supports us-east-1
  env: { region: 'us-east-1' }
});



