# Azure Deployment Guide

This guide explains how to deploy FinVibe to Azure using **Terraform with Azure Verified Modules (AVM)** and GitHub Actions.

## Overview

FinVibe is deployed to Azure using infrastructure-as-code with Terraform. The deployment is fully automated through GitHub Actions and uses Microsoft's Azure Verified Modules for best practices and security.

## Architecture

The deployment creates:
- **Azure Container Registry (ACR)** - Stores Docker images
- **Azure Container Apps Environment** - Provides the runtime environment
- **Backend Container App** - Node.js/Express API
- **Frontend Container App** - React/Vite application

All infrastructure is defined in Terraform configuration files in the `infra/` directory.

## Prerequisites

- An Azure account with an active subscription
- Azure CLI installed locally (for setup)
- Terraform 1.9+ installed (for local deployment)
- Access to configure GitHub repository secrets

## Deployment Methods

You can deploy FinVibe to Azure in two ways:

### Option 1: Automated Deployment via GitHub Actions (Recommended)

This method automatically deploys when you push to the `main` branch.

### Option 2: Manual Deployment with Terraform

Deploy directly from your local machine using Terraform CLI.

---

## Option 1: Automated Deployment via GitHub Actions

### Step 1: Azure Authentication Setup

The deployment uses **OpenID Connect (OIDC)** authentication, which is the modern, secure method recommended by Azure and GitHub.

#### 1.1 Create an Azure AD Application

```bash
# Login to Azure
az login

# Create Azure AD application
az ad app create --display-name "finvibe-github-actions"
```

Note the `appId` from the output - this is your `AZURE_CLIENT_ID`.

#### 1.2 Create a Service Principal

```bash
# Create service principal
az ad sp create --id <appId>

# Get your Azure tenant ID
az account show --query tenantId -o tsv

# Get your Azure subscription ID
az account show --query id -o tsv
```

#### 1.3 Configure Federated Credentials

Configure the Azure AD application to trust GitHub Actions:

```bash
az ad app federated-credential create \
  --id <appId> \
  --parameters '{
    "name": "finvibe-github-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:Egoorbis/finvibe:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'
```

#### 1.4 Assign Azure Permissions

Grant the service principal Contributor permissions:

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID
```

### Step 2: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<appId>` | Application (client) ID from Step 1.1 |
| `AZURE_TENANT_ID` | Your tenant ID | Azure AD tenant ID from Step 1.2 |
| `AZURE_SUBSCRIPTION_ID` | Your subscription ID | Azure subscription ID from Step 1.2 |
| `ACR_NAME` | Your unique ACR name | (Optional) Container registry name |

### Step 3: Deploy

Push to the `main` branch or manually trigger the workflow:

```bash
git push origin main
```

Or trigger manually from GitHub:
1. Go to Actions tab
2. Select "Deploy to Azure with Terraform"
3. Click "Run workflow"

The GitHub Actions workflow will:
1. ✅ Plan infrastructure changes with Terraform
2. ✅ Apply infrastructure changes if needed
3. ✅ Build and push Docker images to ACR
4. ✅ Deploy containers to Azure Container Apps
5. ✅ Run database migrations
6. ✅ Display deployment URLs

---

## Option 2: Manual Deployment with Terraform

### Step 1: Install Prerequisites

**Terraform:**
```bash
# Windows
winget install Hashicorp.Terraform

# macOS
brew install terraform

# Linux
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
sudo apt-get update && sudo apt-get install terraform
```

**Azure CLI:**
```bash
# Windows
winget install Microsoft.AzureCLI

# macOS
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### Step 2: Configure Terraform Variables

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set:
- `subscription_id` - Get with: `az account show --query id -o tsv`
- `acr_name` - Must be globally unique, alphanumeric only (e.g., "finvibereg123")
- Other variables as needed

### Step 3: Login to Azure

```bash
az login
az account set --subscription <your-subscription-id>
```

### Step 4: Deploy Infrastructure

```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Preview changes
terraform plan

# Deploy infrastructure
terraform apply
```

Type `yes` when prompted to confirm.

### Step 5: Deploy Application Containers

After infrastructure is created:

```bash
# Get outputs
ACR_LOGIN_SERVER=$(terraform output -raw container_registry_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)
BACKEND_APP=$(terraform output -raw backend_app_name)
FRONTEND_APP=$(terraform output -raw frontend_app_name)

# Login to ACR
az acr login --name $ACR_LOGIN_SERVER

# Build and push backend
cd ../backend
docker build -t $ACR_LOGIN_SERVER/finvibe-backend:latest .
docker push $ACR_LOGIN_SERVER/finvibe-backend:latest

# Build and push frontend
cd ../frontend
docker build -t $ACR_LOGIN_SERVER/finvibe-frontend:latest .
docker push $ACR_LOGIN_SERVER/finvibe-frontend:latest

# Update Container Apps
az containerapp update \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/finvibe-backend:latest

az containerapp update \
  --name $FRONTEND_APP \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_LOGIN_SERVER/finvibe-frontend:latest

# Run migrations
az containerapp exec \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --command "/bin/sh" \
  --args "-c 'npm run db:migrate'"
```

### Step 6: Get Application URLs

```bash
# View all outputs including URLs
terraform output

# Or get specific URLs
echo "Backend API: $(terraform output -raw backend_app_api_url)"
echo "Frontend: $(terraform output -raw frontend_app_url)"
```

---

## Infrastructure as Code

All infrastructure is defined using Terraform with Azure Verified Modules (AVM):

### Terraform Files

- `infra/main.tf` - Main infrastructure configuration
- `infra/variables.tf` - Variable definitions
- `infra/outputs.tf` - Output definitions
- `infra/terraform.tfvars` - Your configuration values (gitignored)

### Azure Verified Modules Used

1. **Container Registry** - [avm-res-containerregistry-registry](https://registry.terraform.io/modules/Azure/avm-res-containerregistry-registry/azurerm/latest)
2. **Container Apps Environment** - [avm-res-app-managedenvironment](https://registry.terraform.io/modules/Azure/avm-res-app-managedenvironment/azurerm/latest)
3. **Container Apps** - [avm-res-app-containerapp](https://registry.terraform.io/modules/Azure/avm-res-app-containerapp/azurerm/latest)

These modules follow Microsoft's best practices and are production-ready.

## Monitoring and Logs

### View Application Logs

```bash
# Backend logs
az containerapp logs show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --follow

# Frontend logs
az containerapp logs show \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --follow
```

### View Terraform State

```bash
cd infra
terraform show
terraform state list
```

### Azure Portal

View all resources in the [Azure Portal](https://portal.azure.com):
- Search for "finvibe-rg" resource group
- Or use the portal link from `terraform output deployment_summary`

## Updating Infrastructure

To modify infrastructure:

1. Edit Terraform files in `infra/` directory
2. Run `terraform plan` to preview changes
3. Run `terraform apply` to apply changes
4. Or push to `main` branch for automatic deployment

## Security Features

✅ **Managed Identities** - No credentials stored, apps use Azure Managed Identity
✅ **RBAC** - Role-based access control for all resources
✅ **OIDC Authentication** - GitHub Actions uses OIDC, no secrets stored
✅ **Network Security** - Configurable network access controls
✅ **Encryption** - Data encrypted at rest and in transit
✅ **Purge Protection** - Enabled for Key Vault resources
✅ **Azure Verified Modules** - Following Microsoft best practices

## Troubleshooting

### GitHub Actions Fails

1. **Authentication errors**: Verify all three secrets are set correctly
2. **Federated credential issues**: Ensure the subject matches your repo and branch
3. **Permission errors**: Verify service principal has Contributor role

### Terraform Errors

1. **ACR name already exists**: Must be globally unique, try different name
2. **State lock**: Another operation in progress, wait or use `terraform force-unlock`
3. **Authentication**: Run `az login` and verify subscription

### Container Registry Authentication

```bash
# Enable admin access (if needed)
az acr update --name <acr-name> --admin-enabled true

# Login to ACR
az acr login --name <acr-name>
```

### Container App Issues

```bash
# Check app status
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.runningStatus

# View recent revisions
az containerapp revision list \
  --name finvibe-backend \
  --resource-group finvibe-rg
```

## Cost Management

To minimize Azure costs:
- Container Apps scale to zero when idle (set `min_replicas = 0`)
- Use Basic SKU for Container Registry
- Monitor costs in Azure Portal → Cost Management
- Resources are tagged for cost tracking

Estimated monthly cost (Basic setup):
- Container Registry (Basic): ~$5/month
- Container Apps: Pay-per-use, can be $0 when idle
- Log Analytics: Based on ingestion, typically $5-10/month

## Cleanup

### Remove All Resources

**Using Terraform:**
```bash
cd infra
terraform destroy
```

**Using Azure CLI:**
```bash
az group delete --name finvibe-rg --yes --no-wait
```

**Warning**: This permanently deletes all resources and data. Use with caution.

## CI/CD Workflow

The GitHub Actions workflow (`.github/workflows/azure-deploy-terraform.yml`) includes:

1. **Terraform Plan** - Plans infrastructure changes
2. **Terraform Apply** - Applies approved changes
3. **Build & Deploy** - Builds images and updates Container Apps

The workflow only applies infrastructure changes if Terraform detects modifications.

## Best Practices

✅ **Use Terraform** - Infrastructure as Code for repeatability
✅ **Version Control** - All infrastructure in Git
✅ **Azure Verified Modules** - Microsoft-verified, production-ready
✅ **Managed Identity** - No credential management needed
✅ **Auto-scaling** - Apps scale based on demand
✅ **Monitoring** - Integrated with Azure Monitor and Log Analytics
✅ **CI/CD** - Automated deployments via GitHub Actions

## Additional Resources

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Verified Modules](https://azure.github.io/Azure-Verified-Modules/)
- [Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/)
- [GitHub OIDC with Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/)

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review Terraform plan output
3. Check Azure Portal for resource status
4. View Container Apps logs with Azure CLI

---

**Note**: This deployment uses Terraform with Azure Verified Modules for production-grade infrastructure following Microsoft best practices.
