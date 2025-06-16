import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { CertificateStack } from './certificate-stack';
import { CloudFrontDistributionStack } from './cloudfront-distribution-stack';
import { LambdaEdgeStack } from './lambda-edge-stack';
import { AuthorizationEdgeFunctionStack } from './authorization-edge-function-stack';
import { GitHubActionsRoleStack } from './github-actions-role-stack';

import { getEnvironmentConfig } from './environment-config';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const environment = app.node.tryGetContext('environment') || 'production';

console.log(`Deploying environment: ${environment}`);

const environmentConfig = getEnvironmentConfig(environment);

// Create GitHub Actions role stack (shared across environments)
const githubActionsRoleStack = new GitHubActionsRoleStack(app, 'GitHubActionsRoleStack', {
  env: { region: 'ap-northeast-1', account: account },
});

// us-east-1でCertificateStackを作成
const certificateStack = new CertificateStack(app, `CertificateStack-${environmentConfig.name}`, {
  env: { region: 'us-east-1', account: account },
  environmentConfig,
});

// us-east-1でLambdaEdgeStackを作成
const lambdaEdgeStack = new LambdaEdgeStack(app, `LambdaEdgeStack-${environmentConfig.name}`, {
  env: { region: 'us-east-1', account: account },
  environmentConfig,
});

const authorizationEdgeFunctionStack = new AuthorizationEdgeFunctionStack(app, `AuthorizationEdgeFunctionStack-${environmentConfig.name}`, {
  env: { region: 'us-east-1', account: account },
  environmentConfig,
});

// 東京リージョン(ap-northeast-1)でCloudFrontDistributionStackを作成
const cloudFrontDistributionStack = new CloudFrontDistributionStack(app, `CloudFrontDistributionStack-${environmentConfig.name}`, {
  env: { region: 'ap-northeast-1', account: account },
  environmentConfig,
});

// 依存関係を設定
cloudFrontDistributionStack.addDependency(certificateStack);
cloudFrontDistributionStack.addDependency(lambdaEdgeStack);
cloudFrontDistributionStack.addDependency(authorizationEdgeFunctionStack);
