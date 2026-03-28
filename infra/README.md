# Terraform Infrastructure for FinVibe

This directory contains Terraform configuration files for deploying FinVibe to Azure using Azure Verified Modules (AVM).

## Overview

The infrastructure includes:
- **Azure Container Registry (ACR)** - Stores Docker images using [avm-res-containerregistry-registry](https://registry.terraform.io/modules/Azure/avm-res-containerregistry-registry/azurerm/latest)
- **Azure Container Apps Environment** - Runtime environment using [avm-res-app-managedenvironment](https://registry.terraform.io/modules/Azure/avm-res-app-managedenvironment/azurerm/latest)
- **Backend Container App** - Node.js/Express API using [avm-res-app-containerapp](https://registry.terraform.io/modules/Azure/avm-res-app-containerapp/azurerm/latest)
- **Frontend Container App** - React/Vite application using [avm-res-app-containerapp](https://registry.terraform.io/modules/Azure/avm-res-app-containerapp/azurerm/latest)

All modules are Azure Verified Modules, which follow Microsoft's best practices for security, reliability, and maintainability.

## Prerequisites

1. **Terraform** - Install Terraform 1.9 or later
   - **Windows**: `winget install Hashicorp.Terraform`
   - **macOS**: `brew install terraform`
   - **Linux**: Download from [terraform.io](https://www.terraform.io/downloads)

2. **Azure CLI** - For authentication and deployment validation
   ```bash
   # Windows
   winget install Microsoft.AzureCLI

   # macOS
   brew install azure-cli

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Azure Subscription** - Active Azure subscription with Contributor access

## Quick Start

### 1. Configure Variables

Copy the example variables file and customize it:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `subscription_id` - Your Azure subscription ID (get with `az account show --query id -o tsv`)
- `acr_name` - Unique name for your container registry (alphanumeric only)
- Other variables as needed (optional)

### 2. Login to Azure

```bash
az login
az account set --subscription <your-subscription-id>
```

### 3. Initialize Terraform

```bash
terraform init
```

This downloads the required providers and Azure Verified Modules.

### 4. Validate Configuration

```bash
terraform validate
```

### 5. Preview Changes

```bash
terraform plan
```

Review the planned changes to ensure everything looks correct.

### 6. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted to confirm the deployment.

### 7. View Outputs

After successful deployment:

```bash
terraform output
```

This shows:
- Container Registry login server
- Backend and Frontend URLs
- Azure Portal link

## File Structure

```
infra/
├── main.tf                    # Main infrastructure configuration
├── variables.tf               # Input variable definitions
├── outputs.tf                 # Output value definitions
├── terraform.tfvars.example   # Example variable values
├── terraform.tfvars           # Your actual values (gitignored)
├── .gitignore                 # Terraform-specific gitignore
└── README.md                  # This file
```

## Configuration Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `subscription_id` | Azure subscription ID | - | Yes |
| `acr_name` | Container registry name (alphanumeric only) | - | Yes |
| `resource_group_name` | Resource group name | `finvibe-rg` | No |
| `location` | Azure region | `swedencentral` | No |
| `container_env_name` | Container Apps environment name | `finvibe-env` | No |
| `backend_app_name` | Backend app name | `finvibe-backend` | No |
| `frontend_app_name` | Frontend app name | `finvibe-frontend` | No |
| `backend_min_replicas` | Backend minimum replicas | `1` | No |
| `backend_max_replicas` | Backend maximum replicas | `3` | No |
| `frontend_min_replicas` | Frontend minimum replicas | `1` | No |
| `frontend_max_replicas` | Frontend maximum replicas | `3` | No |
| `acr_sku` | Container registry SKU | `Basic` | No |
| `tags` | Resource tags | See variables.tf | No |

## Outputs

After deployment, Terraform provides:

- `backend_app_url` - Backend application URL
- `backend_app_api_url` - Backend API endpoint
- `frontend_app_url` - Frontend application URL
- `container_registry_login_server` - ACR login server
- `deployment_summary` - Complete deployment summary with Azure Portal link

## Managing the Infrastructure

### Update Infrastructure

Modify the Terraform files and run:

```bash
terraform plan
terraform apply
```

### Destroy Infrastructure

To remove all resources:

```bash
terraform destroy
```

**Warning**: This permanently deletes all resources including data. Use with caution.

### View Current State

```bash
terraform show
```

### List Resources

```bash
terraform state list
```

## CI/CD Integration

The infrastructure is automatically deployed via GitHub Actions when code is pushed to the `main` branch. See `.github/workflows/azure-deploy-terraform.yml`.

The workflow:
1. Plans infrastructure changes
2. Applies approved changes
3. Builds and pushes Docker images
4. Updates Container Apps
5. Runs database migrations

### Required GitHub Secrets

Configure these in your GitHub repository (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure AD application (client) ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_NAME` | Container registry name (optional, defaults to finvibereg) |

## Security Features

The Terraform configuration includes:

- **Managed Identities** - All apps use system-assigned managed identities
- **RBAC** - Role-based access control for ACR pull permissions
- **No Hardcoded Credentials** - Managed identity authentication
- **Network Security** - Configurable network access controls
- **Encryption** - Data encrypted at rest and in transit
- **Purge Protection** - Key Vault purge protection enabled
- **Admin Access** - ACR admin access can be disabled for production

## Troubleshooting

### Terraform Init Fails

```bash
# Clear terraform cache and reinitialize
rm -rf .terraform .terraform.lock.hcl
terraform init
```

### Authentication Errors

```bash
# Re-login to Azure
az login
az account show
```

### ACR Name Already Exists

The ACR name must be globally unique. Try a different name in `terraform.tfvars`:

```hcl
acr_name = "finvibe$(uuidgen | tr -d '-' | head -c 8)"
```

### Plan Shows Unwanted Changes

Review the plan output carefully. If you see unexpected changes:

```bash
terraform plan -out=tfplan
terraform show tfplan
```

### State Lock Issues

If another operation is in progress:

```bash
# Wait for the operation to complete or force unlock (use carefully)
terraform force-unlock <lock-id>
```

## Cost Optimization

To minimize Azure costs:

- Use `Basic` SKU for Container Registry (default)
- Set `min_replicas = 0` to scale to zero when idle
- Monitor usage in Azure Portal → Cost Management
- Delete resources when not needed with `terraform destroy`

## Azure Verified Modules

This configuration uses official Azure Verified Modules (AVM):

- [Container Registry](https://registry.terraform.io/modules/Azure/avm-res-containerregistry-registry/azurerm/latest)
- [Container Apps Environment](https://registry.terraform.io/modules/Azure/avm-res-app-managedenvironment/azurerm/latest)
- [Container App](https://registry.terraform.io/modules/Azure/avm-res-app-containerapp/azurerm/latest)

These modules are:
- ✅ Verified by Microsoft
- ✅ Follow Azure best practices
- ✅ Regularly updated
- ✅ Production-ready
- ✅ Well-documented

## Additional Resources

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Verified Modules](https://azure.github.io/Azure-Verified-Modules/)
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)

## Support

For issues related to:
- **Infrastructure**: Check [Azure Portal](https://portal.azure.com) and Container Apps logs
- **Terraform**: Run `terraform validate` and check syntax
- **Deployment**: Review GitHub Actions workflow logs
- **Application**: Check application logs in Azure Portal

## License

This infrastructure code is part of the FinVibe project. See the main repository for license information.
