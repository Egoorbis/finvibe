# Data source for current client configuration
data "azurerm_client_config" "current" {}

# Data source for existing Azure Container Registry
data "azurerm_container_registry" "existing" {
  name                = "metrreg"
  resource_group_name = "rg-base-container"
}

# Data source for backend container app to get ingress details
data "azurerm_container_app" "backend" {
  name                = var.backend_app_name
  resource_group_name = azurerm_resource_group.main.name

  depends_on = [module.backend_container_app]
}

# Data source for frontend container app to get ingress details
data "azurerm_container_app" "frontend" {
  name                = var.frontend_app_name
  resource_group_name = azurerm_resource_group.main.name

  depends_on = [module.frontend_container_app]
}
