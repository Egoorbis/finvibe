variable "resource_group_name" {
  description = "Name of the Azure resource group"
  type        = string
  default     = "finvibe-rg"
}

variable "location" {
  description = "Azure region where resources will be created"
  type        = string
  default     = "swedencentral"
}

variable "container_env_name" {
  description = "Name of the Container Apps Environment"
  type        = string
  default     = "finvibe-env"
}

variable "backend_app_name" {
  description = "Name of the backend Container App"
  type        = string
  default     = "finvibe-backend"
}

variable "backend_min_replicas" {
  description = "Minimum number of replicas for the backend app"
  type        = number
  default     = 1
  validation {
    condition     = var.backend_min_replicas >= 0 && var.backend_min_replicas <= 30
    error_message = "Backend min replicas must be between 0 and 30"
  }
}

variable "backend_max_replicas" {
  description = "Maximum number of replicas for the backend app"
  type        = number
  default     = 1
  validation {
    condition     = var.backend_max_replicas >= 1 && var.backend_max_replicas <= 30
    error_message = "Backend max replicas must be between 1 and 30"
  }
}

variable "frontend_app_name" {
  description = "Name of the frontend Container App"
  type        = string
  default     = "finvibe-frontend"
}

variable "frontend_min_replicas" {
  description = "Minimum number of replicas for the frontend app"
  type        = number
  default     = 1
  validation {
    condition     = var.frontend_min_replicas >= 0 && var.frontend_min_replicas <= 30
    error_message = "Frontend min replicas must be between 0 and 30"
  }
}

variable "frontend_max_replicas" {
  description = "Maximum number of replicas for the frontend app"
  type        = number
  default     = 1
  validation {
    condition     = var.frontend_max_replicas >= 1 && var.frontend_max_replicas <= 30
    error_message = "Frontend max replicas must be between 1 and 30"
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "lab"
    Project     = "finvibe"
    ManagedBy   = "terraform"
  }
}

variable "resend_api_key" {
  description = "API key for Resend email service"
  type        = string
  sensitive   = true
}

variable "resend_from_email" {
  description = "From email address for Resend"
  type        = string
  default     = "noreply@finvibe.com"
}

variable "postgres_db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "finvibe"
}

variable "postgres_user" {
  description = "PostgreSQL username"
  type        = string
  default     = "finvibe_user"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for signing JWT tokens (minimum 32 characters)"
  type        = string
  sensitive   = true
}

variable "frontend_allowed_ips" {
  description = "List of IPv4 addresses or CIDR ranges allowed to access the frontend (IPv6 not supported by Azure Container Apps)"
  type = list(object({
    name             = string
    ip_address_range = string
    description      = optional(string)
  }))
  default = [
    {
      name             = "allowed-ip-1"
      ip_address_range = "82.220.81.212/32"
      description      = "Allowed IP address 1"
    }
  ]
}
