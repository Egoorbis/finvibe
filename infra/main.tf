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
  source              = "Azure/avm-res-managedidentity-userassignedidentity/azurerm"
  version             = "0.5.0"
  name                = "uami-finvibe"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  role_assignments = {
    repository_contributor = {
      role_definition_id_or_name = "Container Registry Repository Contributor"
      scope                      = data.azurerm_container_registry.existing.id
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

# PostgreSQL Container App using Azure Verified Module
module "postgres_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                                  = "finvibe-postgres"
  resource_group_name                   = azurerm_resource_group.main.name
  container_app_environment_resource_id = module.container_apps_environment.resource_id

  # Revision mode
  revision_mode = "Single"

  # Container configuration
  template = {
    containers = [{
      name   = "postgres"
      image  = "postgres:16-alpine"
      cpu    = 0.5
      memory = "1Gi"

      env = [
        {
          name  = "POSTGRES_DB"
          value = var.postgres_db_name
        },
        {
          name  = "POSTGRES_USER"
          value = var.postgres_user
        },
        {
          name  = "POSTGRES_PASSWORD"
          value = var.postgres_password
        },
        {
          name  = "PGDATA"
          value = "/var/lib/postgresql/data/pgdata"
        }
      ]

      volume_mounts = [{
        name = "postgres-data"
        path = "/var/lib/postgresql/data"
      }]
    }]

    min_replicas = 1
    max_replicas = 1

    volumes = [{
      name         = "postgres-data"
      storage_type = "AzureFile"
      storage_name = azurerm_container_app_environment_storage.postgres.name
    }]
  }

  # Internal-only ingress for database access
  ingress = {
    external_enabled = false
    target_port      = 5432
    transport        = "tcp"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
  }

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    azurerm_container_app_environment_storage.postgres
  ]
}

# Backend Container App using Azure Verified Module
module "backend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                                  = var.backend_app_name
  resource_group_name                   = azurerm_resource_group.main.name
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
        },
        {
          name  = "DB_TYPE"
          value = "postgres"
        },
        {
          name  = "DB_HOST"
          value = module.postgres_container_app.latest_revision_fqdn
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = var.postgres_db_name
        },
        {
          name  = "DB_USER"
          value = var.postgres_user
        },
        {
          name  = "DB_PASSWORD"
          value = var.postgres_password
        },
        {
          name  = "RESEND_API_KEY"
          value = var.resend_api_key
        },
        {
          name  = "RESEND_FROM_EMAIL"
          value = var.resend_from_email
        },
        {
          name  = "JWT_SECRET"
          value = var.jwt_secret
        },
        {
          name  = "CORS_ORIGIN"
          value = var.cors_allowed_origin
        }
      ]
    }]

    min_replicas = var.backend_min_replicas
    max_replicas = var.backend_max_replicas
  }

  # Ingress configuration
  ingress = {
    external_enabled = false
    target_port      = 3000
    transport        = "auto"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
  }

  # Registry configuration for image pull authentication
  registries = [{
    server   = data.azurerm_container_registry.existing.login_server
    identity = module.avm-res-managedidentity-userassignedidentity.resource_id
  }]

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    module.avm-res-managedidentity-userassignedidentity,
    module.postgres_container_app
  ]

}


# Frontend Container App using Azure Verified Module
module "frontend_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                                  = var.frontend_app_name
  resource_group_name                   = azurerm_resource_group.main.name
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
          value = "https://${module.backend_container_app.latest_revision_fqdn}/api"
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
    ip_restrictions = [
      for ip in var.frontend_allowed_ips : {
        name             = ip.name
        ip_range         = ip.ip_address_range
        action           = "Allow"
        description      = ip.description
      }
    ]
  }

  # Registry configuration for image pull authentication
  registries = [{
    server   = data.azurerm_container_registry.existing.login_server
    identity = module.avm-res-managedidentity-userassignedidentity.resource_id
  }]

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    module.backend_container_app,
    module.avm-res-managedidentity-userassignedidentity
  ]
}
