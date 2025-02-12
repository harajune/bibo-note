import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from './certificate-stack';
import { CloudFrontDistributionStack } from './cloudfront-distribution-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;

// us-east-1でCertificateStackを作成
const certificateStack = new CertificateStack(app, 'CertificateStack', {
  env: { region: 'us-east-1', account: account },
});

// 東京リージョン(ap-northeast-1)でCloudFrontDistributionStackを作成し、先ほどの証明書ARNを渡す
const cloudFrontDistributionStack = new CloudFrontDistributionStack(app, 'CloudFrontDistributionStack', {
  env: { region: 'ap-northeast-1', account: account },
}); 

cloudFrontDistributionStack.addDependency(certificateStack);
