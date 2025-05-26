import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from './certificate-stack';
import { CloudFrontDistributionStack } from './cloudfront-distribution-stack';
import { DevelopmentDistributionStack } from './development-distribution-stack';
import { LambdaEdgeStack } from './lambda-edge-stack';
import { AuthorizationEdgeFunctionStack } from './authorization-edge-function-stack';
import { GitHubActionsRoleStack } from './github-actions-role-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;
const environment = app.node.tryGetContext('environment') || 'production';

// Create GitHub Actions role stack
const githubActionsRoleStack = new GitHubActionsRoleStack(app, 'GitHubActionsRoleStack', {
  env: { region: 'ap-northeast-1', account: account },
});

if (environment === 'development') {
  // For development environment, deploy a simpler stack
  const developmentDistributionStack = new DevelopmentDistributionStack(app, 'DevelopmentDistributionStack', {
    env: { region: 'ap-northeast-1', account: account },
  });
} else {
  // Production environment uses a more complex stack with CloudFront and Lambda@Edge
  // us-east-1でCertificateStackを作成
  const certificateStack = new CertificateStack(app, 'CertificateStack', {
    env: { region: 'us-east-1', account: account },
  });

  // us-east-1でLambdaEdgeStackを作成
  const lambdaEdgeStack = new LambdaEdgeStack(app, 'LambdaEdgeStack', {
    env: { region: 'us-east-1', account: account },
  });

  const authorizationEdgeFunctionStack = new AuthorizationEdgeFunctionStack(app, 'AuthorizationEdgeFunctionStack', {
    env: { region: 'us-east-1', account: account },
  });

  // 東京リージョン(ap-northeast-1)でCloudFrontDistributionStackを作成
  const cloudFrontDistributionStack = new CloudFrontDistributionStack(app, 'CloudFrontDistributionStack', {
    env: { region: 'ap-northeast-1', account: account },
  });

  // 依存関係を設定
  cloudFrontDistributionStack.addDependency(certificateStack);
  cloudFrontDistributionStack.addDependency(lambdaEdgeStack);
  cloudFrontDistributionStack.addDependency(authorizationEdgeFunctionStack);
}
