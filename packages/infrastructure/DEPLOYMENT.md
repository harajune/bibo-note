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

## Project Structure

```
.
├── packages/
│   ├── web/           # Frontend application (Hono + Vite)
│   └── infrastructure/ # AWS CDK infrastructure code
├── .github/
│   └── workflows/     # GitHub Actions workflows
└── pnpm-workspace.yaml # PNPM workspace configuration
```

## Deployment Commands

### Development
```bash
# Configure AWS SSO for development
pnpm --filter infrastructure dev:login:configure

# Login to AWS SSO for development
pnpm --filter infrastructure dev:login

# Deploy development environment
pnpm --filter infrastructure dev:deploy
```

### Production
```bash
# Configure AWS SSO for production
pnpm --filter infrastructure prod:login:configure

# Login to AWS SSO for production
pnpm --filter infrastructure prod:login

# Deploy production environment
pnpm --filter infrastructure prod:deploy
```

## GitHub Actions Workflows

- **Development**: `.github/workflows/aws-deploy-dev.yml` - deploys on `main` branch
- **Production**: `.github/workflows/aws-deploy.yml` - deploys on `prod` branch

## Environment Configuration

Environment-specific settings are managed in `packages/infrastructure/environment-config.ts`:

- Domain names
- Certificate SSM parameter names
- Application mode (development/production)
- Security settings

## Resource Naming

All AWS resources include the environment name as a suffix to prevent conflicts:
- Lambda functions: `application-worker-{environment}`
- Edge functions: `authorization-edge-function-{environment}`
- Stacks: `{StackName}-{environment}`