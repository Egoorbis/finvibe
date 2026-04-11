locals {
  postgres_storage_account_name = substr("st${join("", regexall("[a-z0-9]", lower(var.container_env_name)))}pg", 0, 24)
  postgres_file_share_name      = "postgres-data"
}

# Premium file share storage account for PostgreSQL data
resource "azurerm_storage_account" "postgres" {
  name                     = local.postgres_storage_account_name
  location                 = azurerm_resource_group.main.location
  resource_group_name      = azurerm_resource_group.main.name
  account_kind             = "FileStorage"
  account_tier             = "Premium"
  account_replication_type = "LRS"

  tags = var.tags
}

# Premium Azure Files share for PostgreSQL
resource "azurerm_storage_share" "postgres" {
  name                 = local.postgres_file_share_name
  storage_account_id   = azurerm_storage_account.postgres.id
  quota                = var.postgres_disk_size_gb
}

# Container Apps Environment Storage backed by Azure Files
resource "azapi_resource" "postgres_storage" {
  type      = "Microsoft.App/managedEnvironments/storages@2024-02-02-preview"
  name      = "postgres-storage"
  parent_id = module.container_apps_environment.resource_id

  schema_validation_enabled = false

  body = {
    properties = {
      azureFile = {
        accessMode  = "ReadWrite"
        accountName = azurerm_storage_account.postgres.name
        accountKey  = azurerm_storage_account.postgres.primary_access_key
        shareName   = azurerm_storage_share.postgres.name
      }
    }
  }

  depends_on = [
    module.container_apps_environment,
    azurerm_storage_share.postgres
  ]
}
