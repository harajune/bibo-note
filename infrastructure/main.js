"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cdk = require("aws-cdk-lib");
var certificate_stack_1 = require("./certificate-stack");
var cloudfront_distribution_stack_1 = require("./cloudfront-distribution-stack");
var lambda_edge_stack_1 = require("./lambda-edge-stack");
var authorization_edge_function_stack_1 = require("./authorization-edge-function-stack");
var github_actions_role_stack_1 = require("./github-actions-role-stack");
var app = new cdk.App();
var account = process.env.CDK_DEFAULT_ACCOUNT;
// Create GitHub Actions role stack
var githubActionsRoleStack = new github_actions_role_stack_1.GitHubActionsRoleStack(app, 'GitHubActionsRoleStack', {
    env: { region: 'ap-northeast-1', account: account },
});
// us-east-1でCertificateStackを作成
var certificateStack = new certificate_stack_1.CertificateStack(app, 'CertificateStack', {
    env: { region: 'us-east-1', account: account },
});
// us-east-1でLambdaEdgeStackを作成
var lambdaEdgeStack = new lambda_edge_stack_1.LambdaEdgeStack(app, 'LambdaEdgeStack', {
    env: { region: 'us-east-1', account: account },
});
var authorizationEdgeFunctionStack = new authorization_edge_function_stack_1.AuthorizationEdgeFunctionStack(app, 'AuthorizationEdgeFunctionStack', {
    env: { region: 'us-east-1', account: account },
});
// 東京リージョン(ap-northeast-1)でCloudFrontDistributionStackを作成
var cloudFrontDistributionStack = new cloudfront_distribution_stack_1.CloudFrontDistributionStack(app, 'CloudFrontDistributionStack', {
    env: { region: 'ap-northeast-1', account: account },
});
// 依存関係を設定
cloudFrontDistributionStack.addDependency(certificateStack);
cloudFrontDistributionStack.addDependency(lambdaEdgeStack);
cloudFrontDistributionStack.addDependency(authorizationEdgeFunctionStack);
