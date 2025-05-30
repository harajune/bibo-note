import * as cdk from 'aws-cdk-lib';
import { DevCertificateStack } from './dev-certificate-stack';
import { DevDistributionStack } from './dev-distribution-stack';
import { GitHubActionsRoleStack } from './github-actions-role-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Create GitHub Actions role stack
const githubActionsRoleStack = new GitHubActionsRoleStack(app, 'GitHubActionsRoleStack', {
  env: { region: 'ap-northeast-1', account: account },
});

// us-east-1でDevCertificateStackを作成 (Development環境用)
const devCertificateStack = new DevCertificateStack(app, 'DevCertificateStack', {
  env: { region: 'us-east-1', account: account },
});

// 東京リージョン(ap-northeast-1)でDevDistributionStackを作成
const devDistributionStack = new DevDistributionStack(app, 'DevDistributionStack', {
  env: { region: 'ap-northeast-1', account: account },
});

// 依存関係を設定
devDistributionStack.addDependency(devCertificateStack);