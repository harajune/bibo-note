# Bibo Note Infrastructure

This directory contains the AWS infrastructure configuration for the Bibo Note application using Terraform.

## Components

1. **S3 Bucket**: Stores TOML files (replacing R2 storage)
2. **Lambda@Edge**: Processes TOML files and handles routing
3. **CloudFront**: Provides caching and content delivery

## Setup

1. Install Terraform
2. Configure AWS credentials
3. Initialize Terraform:
   ```bash
   cd terraform
   terraform init
   ```

4. Deploy infrastructure:
   ```bash
   terraform plan
   terraform apply
   ```

## Lambda@Edge Function

The Lambda function in the `lambda` directory handles:
- TOML file processing
- Response transformation
- Caching headers

## Architecture

- S3 bucket stores TOML files
- CloudFront distribution with Lambda@Edge processes requests
- Custom cache behavior for TOML files
- Origin Shield enabled for reduced origin requests

## Security

- S3 bucket blocks public access
- CloudFront OAI for S3 access
- IAM roles with least privilege
