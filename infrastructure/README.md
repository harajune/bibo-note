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