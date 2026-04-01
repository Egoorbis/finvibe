output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

output "container_registry_name" {
  description = "Name of the Azure Container Registry"
  value       = data.azurerm_container_registry.existing.name
}

output "container_registry_login_server" {
  description = "Login server URL of the Azure Container Registry"
  value       = data.azurerm_container_registry.existing.login_server
}

output "container_registry_admin_username" {
  description = "Admin username for the Azure Container Registry"
  value       = data.azurerm_container_registry.existing.admin_username
  sensitive   = true
}

output "container_registry_admin_password" {
  description = "Admin password for the Azure Container Registry"
  value       = data.azurerm_container_registry.existing.admin_password
  sensitive   = true
}

output "container_apps_environment_id" {
  description = "ID of the Container Apps Environment"
  value       = module.container_apps_environment.resource_id
}

output "container_apps_environment_name" {
  description = "Name of the Container Apps Environment"
  value       = module.container_apps_environment.name
}


output "deployment_summary" {
  description = "Summary of the deployment with important URLs"
  value = {
    resource_group    = azurerm_resource_group.main.name
    location          = azurerm_resource_group.main.location
    acr_login_server  = data.azurerm_container_registry.existing.login_server
    backend_url       = "https://${module.backend_container_app.fqdn_url[0]}"
    backend_api_url   = "https://${module.backend_container_app.fqdn_url[0]}/api"
    frontend_url      = "https://${module.frontend_container_app.fqdn_url[0]}"
    azure_portal_url  = "https://portal.azure.com/#@/resource${azurerm_resource_group.main.id}"
  }
}
