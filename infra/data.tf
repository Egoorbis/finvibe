# Data source for current client configuration
data "azurerm_client_config" "current" {}

# Data source for existing Azure Container Registry
data "azurerm_container_registry" "existing" {
  name                = "metrreg"
  resource_group_name = "rg-base-container"
}

