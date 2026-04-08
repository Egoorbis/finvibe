# Storage Account for PostgreSQL persistent data
resource "azurerm_storage_account" "postgres" {
  name                     = var.postgres_storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS" # Locally-redundant storage for cost efficiency

  # Security settings
  https_traffic_only_enabled      = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  tags = var.tags
}

# Azure Files share for PostgreSQL data
resource "azurerm_storage_share" "postgres_data" {
  name                 = "postgres-data"
  storage_account_name = azurerm_storage_account.postgres.name
  quota                = var.postgres_storage_quota_gb # Storage size in GB

  metadata = {
    environment = lookup(var.tags, "Environment", "production")
    purpose     = "postgresql-persistent-data"
  }
}

# Container Apps Environment Storage - Links Azure Files to Container Apps
resource "azurerm_container_app_environment_storage" "postgres" {
  name                         = "postgres-storage"
  container_app_environment_id = module.container_apps_environment.resource_id
  account_name                 = azurerm_storage_account.postgres.name
  share_name                   = azurerm_storage_share.postgres_data.name
  access_key                   = azurerm_storage_account.postgres.primary_access_key
  access_mode                  = "ReadWrite"

  depends_on = [
    module.container_apps_environment,
    azurerm_storage_share.postgres_data
  ]
}
