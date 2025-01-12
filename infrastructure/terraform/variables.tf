variable "environment" {
  description = "Environment (development/production)"
  type        = string
  default     = "development"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "bibo-note"
}
