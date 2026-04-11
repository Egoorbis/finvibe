# Managed disk for PostgreSQL persistent storage
resource "azurerm_managed_disk" "postgres" {
  name                 = "${var.container_env_name}-pgdisk"
  location             = azurerm_resource_group.main.location
  resource_group_name  = azurerm_resource_group.main.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.postgres_disk_size_gb

  tags = var.tags
}

# Container Apps Environment Storage backed by Managed Disk (preview)
resource "azapi_resource" "postgres_managed_disk_storage" {
  type      = "Microsoft.App/managedEnvironments/storages@2024-02-02-preview"
  name      = "postgres-storage"
  parent_id = module.container_apps_environment.resource_id

  schema_validation_enabled = false

  body = {
    properties = {
      storageType   = "ManagedDisk"
      managedDiskId = azurerm_managed_disk.postgres.id
      accessMode    = "ReadWrite"
    }
  }

  depends_on = [
    module.container_apps_environment,
    azurerm_managed_disk.postgres
  ]
}
