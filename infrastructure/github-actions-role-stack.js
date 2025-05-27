"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubActionsRoleStack = void 0;
var cdk = require("aws-cdk-lib");
var iam = require("aws-cdk-lib/aws-iam");
var GitHubActionsRoleStack = /** @class */ (function (_super) {
    __extends(GitHubActionsRoleStack, _super);
    function GitHubActionsRoleStack(scope, id, props) {
        var _this = _super.call(this, scope, id, props) || this;
        // Create GitHub OIDC Provider
        var githubOidcProvider = new iam.OpenIdConnectProvider(_this, 'GitHubOidcProvider', {
            url: 'https://token.actions.githubusercontent.com',
            clientIds: ['sts.amazonaws.com'],
            thumbprints: [
                '6938fd4d98bab03faadb97b34396831e3780aea1',
                '1c58a3a8518e8759bf075b76b75096de6e319fc6'
            ],
        });
        // Create the IAM role for GitHub Actions
        var githubActionsRole = new iam.Role(_this, 'GitHubActionsRole', {
            roleName: 'GitHubActionsDeploymentRole',
            assumedBy: new iam.FederatedPrincipal(githubOidcProvider.openIdConnectProviderArn, {
                StringLike: {
                    'token.actions.githubusercontent.com:sub': 'repo:harajune/bibo-note:*'
                },
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
                }
            }, 'sts:AssumeRoleWithWebIdentity'),
            description: 'Role for GitHub Actions to deploy CDK stacks',
        });
        // Add necessary permissions for CDK deployment
        githubActionsRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
        // Output the role ARN
        new cdk.CfnOutput(_this, 'GitHubActionsRoleArn', {
            value: githubActionsRole.roleArn,
            description: 'ARN of the GitHub Actions deployment role',
        });
        return _this;
    }
    return GitHubActionsRoleStack;
}(cdk.Stack));
exports.GitHubActionsRoleStack = GitHubActionsRoleStack;
