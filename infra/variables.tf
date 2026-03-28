variable "subscription_id" {
  description = "The Azure subscription ID"
  type        = string
  sensitive   = true
}

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

variable "acr_name" {
  description = "Name of the Azure Container Registry (must be globally unique, alphanumeric only)"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9]+$", var.acr_name))
    error_message = "ACR name must contain only alphanumeric characters"
  }
}

variable "acr_sku" {
  description = "SKU for the Azure Container Registry"
  type        = string
  default     = "Basic"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium"
  }
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
  default     = 3
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
  default     = 3
  validation {
    condition     = var.frontend_max_replicas >= 1 && var.frontend_max_replicas <= 30
    error_message = "Frontend max replicas must be between 1 and 30"
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "finvibe"
    ManagedBy   = "terraform"
  }
}
