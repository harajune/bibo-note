# Bibo-Note Infrastructure

This directory contains the AWS CDK infrastructure code for Bibo-Note.

## Environments

Bibo-Note supports two environments:

### Development Environment (main branch)

- Entry point: `main-dev.ts`
- Domain: `dev.bibo-note.jp`
- Architecture: API Gateway + Lambda + S3
- Security: IAM authentication
- Deployment: Automatically deployed when code is pushed to the main branch

### Production Environment (prod branch)

- Entry point: `main.ts`
- Domain: `bibo-note.jp` (and `*.bibo-note.jp` wildcard)
- Architecture: CloudFront + Lambda@Edge + Lambda + S3
- Security: Lambda@Edge authentication
- Deployment: Automatically deployed when code is pushed to the prod branch

## Deployment

### GitHub Actions Setup

Before deploying, you need to configure GitHub Actions environments and secrets:

#### Development Environment Setup
1. Create a GitHub environment named "AWS Development"
2. Set the following secrets:
   - `AWS_ROLE_ARN`: IAM role ARN for GitHub Actions OIDC (development account)
   - `AWS_DEV_ACCOUNT_ID`: AWS account ID for development environment

#### Production Environment Setup  
1. Create a GitHub environment named "AWS Production"
2. Set the following secrets:
   - `AWS_ROLE_ARN`: IAM role ARN for GitHub Actions OIDC (production account)
   - `AWS_ACCOUNT_ID`: AWS account ID for production environment

### Manual Deployment

### Development

```bash
yarn cdk:deploy:dev
```

### Production

```bash
yarn cdk:deploy:prod
```

## Infrastructure Components

- **Certificate Stack**: ACM certificates for both environments
- **CloudFront Distribution Stack**: CloudFront distribution for production
- **Dev Distribution Stack**: API Gateway for development
- **Lambda Edge Stack**: Lambda@Edge functions for production
- **Authorization Edge Function Stack**: Lambda@Edge functions for authorization in production
- **GitHub Actions Role Stack**: IAM roles for GitHub Actions