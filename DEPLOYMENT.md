# Multi-Environment Setup

This project now supports two environments:

## Development Environment
- **Domain**: `bibo-note.dev`
- **Deployment**: Triggered by pushes to `main` branch
- **Security**: Basic authentication required for entire site
- **Purpose**: For testing latest changes and features

## Production Environment  
- **Domain**: `bibo-note.jp`
- **Deployment**: Triggered by pushes to `prod` branch
- **Security**: Basic authentication only on edit/admin paths (`e/*`, `new`)
- **Purpose**: Live production environment

## Deployment Commands

### Development
```bash
# Deploy development environment
yarn cdk:deploy:dev

# Synthesize development CDK templates  
yarn cdk:synth:dev
```

### Production
```bash
# Deploy production environment
yarn cdk:deploy:prod

# Synthesize production CDK templates
yarn cdk:synth:prod
```

## GitHub Actions Workflows

- **Development**: `.github/workflows/aws-deploy-dev.yml` - deploys on `main` branch
- **Production**: `.github/workflows/aws-deploy.yml` - deploys on `prod` branch

## Environment Configuration

Environment-specific settings are managed in `infrastructure/environment-config.ts`:

- Domain names
- Certificate SSM parameter names
- Application mode (development/production)
- Security settings

## Resource Naming

All AWS resources include the environment name as a suffix to prevent conflicts:
- Lambda functions: `application-worker-{environment}`
- Edge functions: `authorization-edge-function-{environment}`
- Stacks: `{StackName}-{environment}`