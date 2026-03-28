terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
  subscription_id = var.subscription_id
}

# Data source for current client configuration
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}

# Azure Container Registry using Azure Verified Module
module "container_registry" {
  source  = "Azure/avm-res-containerregistry-registry/azurerm"
  version = "0.5.1"

  name                = var.acr_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # SKU for the registry
  sku = var.acr_sku

  # Enable admin user for easier authentication (can be disabled for production with managed identity)
  admin_enabled = true

  # Public network access - can be disabled for enhanced security
  public_network_access_enabled = true

  # Enable anonymous pull access - disabled for security
  anonymous_pull_enabled = false

  # Managed identity for the registry
  managed_identities = {
    system_assigned = true
  }

  # Role assignments for managed identity
  role_assignments = {
    acr_pull = {
      principal_id         = module.container_apps_environment.managed_identities["system_assigned"].principal_id
      role_definition_name = "AcrPull"
    }
  }

  tags = var.tags
}

# Container Apps Environment using Azure Verified Module
module "container_apps_environment" {
  source  = "Azure/avm-res-app-managedenvironment/azurerm"
  version = "0.3.0"

  name                = var.container_env_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # Enable system-assigned managed identity
  managed_identities = {
    system_assigned = true
  }

  # Log Analytics workspace configuration for monitoring
  log_analytics_workspace_name              = "${var.container_env_name}-logs"
  log_analytics_workspace_resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# Backend Container App using Azure Verified Module
module "backend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.6.0"

  name                         = var.backend_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = module.container_apps_environment.resource_id

  # Revision mode
  revision_mode = "Single"

  # Enable system-assigned managed identity
  managed_identities = {
    system_assigned = true
  }

  # Registry configuration
  registries = [{
    server   = module.container_registry.resource.login_server
    identity = module.backend_container_app.managed_identities["system_assigned"].id
  }]

  # Container configuration
  template = {
    containers = [{
      name   = "backend"
      image  = "${module.container_registry.resource.login_server}/finvibe-backend:latest"
      cpu    = 0.5
      memory = "1Gi"

      env = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ]
    }]

    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas
  }

  # Ingress configuration
  ingress = {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
  }

  # Role assignment for ACR pull
  role_assignments = {
    acr_pull = {
      principal_id         = module.backend_container_app.managed_identities["system_assigned"].principal_id
      role_definition_name = "AcrPull"
      scope_resource_id    = module.container_registry.resource.id
    }
  }

  tags = var.tags

  depends_on = [module.container_apps_environment]
}

# Frontend Container App using Azure Verified Module
module "frontend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.6.0"

  name                         = var.frontend_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = module.container_apps_environment.resource_id

  # Revision mode
  revision_mode = "Single"

  # Enable system-assigned managed identity
  managed_identities = {
    system_assigned = true
  }

  # Registry configuration
  registries = [{
    server   = module.container_registry.resource.login_server
    identity = module.frontend_container_app.managed_identities["system_assigned"].id
  }]

  # Container configuration
  template = {
    containers = [{
      name   = "frontend"
      image  = "${module.container_registry.resource.login_server}/finvibe-frontend:latest"
      cpu    = 0.5
      memory = "1Gi"

      env = [
        {
          name  = "VITE_API_URL"
          value = "https://${module.backend_container_app.fqdn}/api"
        }
      ]
    }]

    min_replicas = var.frontend_min_replicas
    max_replicas = var.frontend_max_replicas
  }

  # Ingress configuration
  ingress = {
    external_enabled = true
    target_port      = 80
    transport        = "auto"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
  }

  # Role assignment for ACR pull
  role_assignments = {
    acr_pull = {
      principal_id         = module.frontend_container_app.managed_identities["system_assigned"].principal_id
      role_definition_name = "AcrPull"
      scope_resource_id    = module.container_registry.resource.id
    }
  }

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    module.backend_container_app
  ]
}
