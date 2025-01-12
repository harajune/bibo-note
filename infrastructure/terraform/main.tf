terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"  # Lambda@Edge must be deployed in us-east-1
}

# S3 bucket for TOML file storage
resource "aws_s3_bucket" "toml_storage" {
  bucket = "bibo-note-toml-storage"
}

resource "aws_s3_bucket_public_access_block" "toml_storage" {
  bucket = aws_s3_bucket.toml_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "toml_storage" {
  bucket = aws_s3_bucket.toml_storage.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"]  # Restrict this in production
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# IAM role for Lambda@Edge
resource "aws_iam_role" "lambda_edge_role" {
  name = "bibo-note-lambda-edge-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "edgelambda.amazonaws.com"
          ]
        }
      }
    ]
  })
}

# IAM policy for Lambda@Edge to access S3
resource "aws_iam_role_policy" "lambda_edge_s3_policy" {
  name = "bibo-note-lambda-edge-s3-policy"
  role = aws_iam_role.lambda_edge_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.toml_storage.arn,
          "${aws_s3_bucket.toml_storage.arn}/*"
        ]
      }
    ]
  })
}

# CloudFront origin access identity
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for bibo-note S3 bucket"
}

# S3 bucket policy allowing CloudFront access
resource "aws_s3_bucket_policy" "toml_storage" {
  bucket = aws_s3_bucket.toml_storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${aws_cloudfront_origin_access_identity.oai.id}"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.toml_storage.arn}/*"
      }
    ]
  })
}

# Lambda@Edge function
resource "aws_lambda_function" "edge_function" {
  filename         = "../lambda/toml-handler.zip"
  function_name    = "bibo-note-edge-function"
  role            = aws_iam_role.lambda_edge_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  publish         = true  # Required for Lambda@Edge

  memory_size     = 128
  timeout         = 5  # Lambda@Edge has a 5s timeout limit

  tags = {
    Name = "bibo-note-edge-function"
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.toml_storage.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.toml_storage.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.toml_storage.id}"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = "${aws_lambda_function.edge_function.arn}:${aws_lambda_function.edge_function.version}"
      include_body = true
    }
  }

  ordered_cache_behavior {
    path_pattern     = "*.toml"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.toml_storage.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "bibo-note-distribution"
  }
}
