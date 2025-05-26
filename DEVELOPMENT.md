# Development Environment Setup

This document describes how to set up and use the development environment for the bibo-note project.

## Environment Types

The project supports two deployment environments:

1. **Development Environment**
   - Deployed from the `main` branch
   - Uses a simpler stack without CloudFront
   - Accessible at `dev.bibo-note.jp` or via Lambda Function URL
   - Protected with basic authentication

2. **Production Environment**
   - Deployed from the `prod` branch
   - Uses full CloudFront distribution with Lambda@Edge
   - Accessible at `bibo-note.jp` and `*.bibo-note.jp`

## Deployment Commands

### Development Environment

```bash
# Deploy to development environment
yarn cdk:deploy:dev

# Generate CloudFormation template for development
yarn cdk:synth:dev
```

### Production Environment

```bash
# Deploy to production environment
yarn cdk:deploy:prod

# Generate CloudFormation template for production
yarn cdk:synth:prod
```

## Branch Strategy

- **main branch**: Development environment
- **prod branch**: Production environment

Changes should be made to the `main` branch first, tested in the development environment, and then merged to the `prod` branch for production deployment.

## Authentication

The development environment uses basic authentication for the `/e/*` (edit) and `/new` endpoints with the same credentials as the production environment.

## Infrastructure Differences

| Feature | Development | Production |
|---------|-------------|------------|
| CDN | None | CloudFront |
| Authentication | Basic Auth in Lambda | Lambda@Edge |
| Domain | dev.bibo-note.jp | bibo-note.jp, *.bibo-note.jp |
| Storage | S3 | S3 |
| Mode | development | production |
