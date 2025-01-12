output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.toml_storage.id
}

output "lambda_function_name" {
  description = "Name of the Lambda@Edge function"
  value       = aws_lambda_function.edge_function.function_name
}
