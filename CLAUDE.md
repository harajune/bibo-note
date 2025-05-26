# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
yarn dev              # Start local development server with Vite
yarn build            # Build for production (client + server bundles)
```

### Testing
```bash
yarn test             # Run all tests with Vitest
yarn test <filename>  # Run specific test file
yarn test --coverage  # Run tests with coverage report
```

### Deployment
```bash
# Cloudflare deployment
yarn deploy           # Build and deploy to Cloudflare Pages

# AWS deployment  
yarn aws:login:prod   # Login to AWS SSO
yarn cdk:synth:prod   # Synthesize CDK stack
yarn cdk:deploy:prod  # Deploy all CDK stacks to AWS
```

## Architecture Overview

### Dual-Platform Design
The application supports two deployment targets:
- **Cloudflare**: Workers/Pages with R2 storage
- **AWS**: Lambda@Edge with CloudFront and S3

Platform selection is determined by the `MODE` environment variable and repository implementations.

### Repository Pattern
Storage abstraction through three implementations:
- `FileRepository`: Local filesystem (development)
- `R2Repository`: Cloudflare R2 (production on Cloudflare)
- `S3Repository`: AWS S3 with lazy-loaded SDK (production on AWS)

The `WikiModel` class automatically selects the appropriate repository based on environment.

### Data Flow
1. Articles are stored as TOML files named `{uuid}.toml`
2. UUIDv7 provides time-ordered unique identifiers
3. Article list cache maintains the 20 most recent articles
4. Multi-tenant mode isolates data by user directory

### Key Architectural Patterns

**Context-based Configuration**
```typescript
// Environment variables accessed via Hono context
const envVariables = env<{ MODE: string }>(this.context);
```

**Immutable Data Structures**
The `createImmutable` utility enforces functional data updates:
```typescript
const updated = immutableWikiData.copyWith({ title: newTitle });
```

**Edge Function Integration**
- Authorization handled by Lambda@Edge viewer request
- Origin request modification for header forwarding
- CloudFront Origin Access Control secures backend access

### Infrastructure Components

**AWS CDK Stack Structure**
- `certificate-stack.ts`: ACM certificate in us-east-1
- `lambda-edge-stack.ts`: Edge functions (must be in us-east-1)
- `cloudfront-distribution-stack.ts`: Main infrastructure in ap-northeast-1
- `github-actions-role-stack.ts`: CI/CD deployment permissions

**Critical Environment Variables**
- `MODE`: "development" | "production"
- `MULTITENANT`: "1" enables user isolation
- `WIKI_BUCKET_NAME`: S3 bucket for AWS deployment
- `MY_BUCKET`: R2 bucket binding for Cloudflare

### Custom Syntax Parser
The application uses a custom lightweight markdown parser (`syntax_parser.ts`) that supports:
- Headings: `#`, `##`, `###` (rendered as h2, h3, h4)
- Lists: `-` (unordered), `+` (ordered)
- Formatting: `*italic*`, `**bold**`
- Nested formatting within bold text

## Project Configuration

### Framework
HonoX - Full-stack framework built on Hono.js and Vite

### Package Manager
Yarn (v4.9.1) - All commands should use `yarn`, not `npm`

### Build Output
- `./dist/worker/` - Server bundle for deployment
- `./dist/static/` - Client assets for CDN
- `./dist/` - Cloudflare Pages output

### Testing Strategy
- Vitest for unit and integration tests
- Test files colocated with source as `*.test.ts`
- Coverage reports via V8 provider