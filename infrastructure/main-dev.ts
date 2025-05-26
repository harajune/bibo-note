import * as cdk from 'aws-cdk-lib';
import { DevelopmentStack } from './development-stack';
import { GitHubActionsRoleStack } from './github-actions-role-stack';

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Create GitHub Actions role stack (shared between prod and dev)
const githubActionsRoleStack = new GitHubActionsRoleStack(app, 'GitHubActionsRoleStack-Dev', {
  env: { region: 'ap-northeast-1', account: account },
});

// Create Development Stack
const developmentStack = new DevelopmentStack(app, 'DevelopmentStack', {
  env: { region: 'ap-northeast-1', account: account },
});