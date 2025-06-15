import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class GitHubActionsRoleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create GitHub OIDC Provider
    const githubOidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubOidcProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: [ // GitHub's OIDC provider thumbprint
        '6938fd4d98bab03faadb97b34396831e3780aea1', 
        '1c58a3a8518e8759bf075b76b75096de6e319fc6'
      ],
    });

    // Create the IAM role for GitHub Actions
    const githubActionsRole = new iam.Role(this, 'GitHubActionsRole', {
      roleName: 'GitHubActionsDeploymentRole',
      assumedBy: new iam.FederatedPrincipal(
        githubOidcProvider.openIdConnectProviderArn,
        {
          StringLike: {
            'token.actions.githubusercontent.com:sub': 'repo:harajune/bibo-note:*'
          },
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role for GitHub Actions to deploy CDK stacks',
    });

    // Add necessary permissions for CDK deployment
    githubActionsRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
    );

    // Output the role ARN
    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
      value: githubActionsRole.roleArn,
      description: 'ARN of the GitHub Actions deployment role',
    });
  }
} 