# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = var.tags
}


# Log Analytics Workspace for Container Apps monitoring
resource "azurerm_log_analytics_workspace" "container_apps" {
  name                = "${var.container_env_name}-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

module "avm-res-managedidentity-userassignedidentity" {
  source  = "Azure/avm-res-managedidentity-userassignedidentity/azurerm"
  version = "0.5.0"
  name                = "uami-finvibe"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  role_assignments = {
    repository_contributor = {
      role_definition_id_or_name  = "Container Registry Repository Contributor"
      scope                = data.azurerm_container_registry.existing.id
    }
  }
}

# Container Apps Environment using Azure Verified Module
module "container_apps_environment" {
  source  = "Azure/avm-res-app-managedenvironment/azurerm"
  version = "0.3.0"

  name                = var.container_env_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # Disable zone redundancy since no infrastructure subnet provided
  zone_redundancy_enabled = false

  # Enable system-assigned managed identity
  managed_identities = {
    system_assigned = true
  }

  # Log Analytics workspace configuration for monitoring
  log_analytics_workspace = {
    resource_id = azurerm_log_analytics_workspace.container_apps.id
  }

  tags = var.tags
}

# Backend Container App using Azure Verified Module
module "backend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                         = var.backend_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_resource_id = module.container_apps_environment.resource_id

  # Revision mode
  revision_mode = "Single"

  # Enable system-assigned managed identity
  managed_identities = {
    user_assigned_resource_ids = [module.avm-res-managedidentity-userassignedidentity.resource_id]
  }

  # Container configuration
  template = {
    containers = [{
      name   = "backend"
      image  = "${data.azurerm_container_registry.existing.login_server}/finvibe-backend:latest"
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

  # Registry configuration for image pull authentication
  registries = [{
    server            = data.azurerm_container_registry.existing.login_server
    identity          = module.avm-res-managedidentity-userassignedidentity.resource_id
  }]

  tags = var.tags

  depends_on = [module.container_apps_environment,
  module.avm-res-managedidentity-userassignedidentity]

}


# Frontend Container App using Azure Verified Module
module "frontend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                         = var.frontend_app_name
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_resource_id = module.container_apps_environment.resource_id

  # Revision mode
  revision_mode = "Single"

  # Enable system-assigned managed identity
  managed_identities = {
    user_assigned_resource_ids = [module.avm-res-managedidentity-userassignedidentity.resource_id]
  }

  # Container configuration
  template = {
    containers = [{
      name   = "frontend"
      image  = "${data.azurerm_container_registry.existing.login_server}/finvibe-frontend:latest"
      cpu    = 0.5
      memory = "1Gi"

      env = [
        {
          name  = "VITE_API_URL"
          value = "${module.backend_container_app.fqdn_url}/api"
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

  # Registry configuration for image pull authentication
  registries = [{
    server            = data.azurerm_container_registry.existing.login_server
    identity          = module.avm-res-managedidentity-userassignedidentity.resource_id
  }]

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    module.backend_container_app,
    module.avm-res-managedidentity-userassignedidentity
  ]
}


