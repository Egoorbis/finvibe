# Azure Deployment Guide

This guide explains how to deploy FinVibe to Azure using **Terraform with Azure Verified Modules (AVM)** and GitHub Actions.

## Overview

FinVibe is deployed to Azure using infrastructure-as-code with Terraform. The deployment is fully automated through GitHub Actions and uses Microsoft's Azure Verified Modules for best practices and security.

## Architecture

The deployment creates:
- **Azure Container Registry (ACR)** - Stores Docker images
- **Azure Container Apps Environment** - Provides the runtime environment
- **PostgreSQL Container App** - Database with Azure Files persistent storage
- **Backend Container App** - Node.js/Express API (internal ingress only)
- **Frontend Container App** - React/Vite app with nginx reverse proxy (external ingress)

### Network Architecture
```
Internet → Frontend (nginx) → /api → Backend (internal) → PostgreSQL (internal)
```

The frontend uses an **nginx reverse proxy** configured at runtime:
- Frontend makes API calls to relative URLs (`/api/...`)
- Nginx proxies these requests to the backend's internal FQDN
- The `BACKEND_URL` environment variable is set by Terraform to the backend's Container App URL
- Backend is only accessible internally (no external ingress)

All infrastructure is defined in Terraform configuration files in the `infra/` directory.

## Prerequisites

- An Azure account with an active subscription
- Azure CLI installed locally (for setup)
- Terraform 1.9+ installed (for local deployment)
- Access to configure GitHub repository secrets

## Deployment Methods

There are two ways to deploy FinVibe to Azure:

### Option 1: Automated Deployment via GitHub Actions (Recommended)

This method automatically deploys infrastructure changes when you push to the `main` branch.

**Workflow**: `.github/workflows/azure-deploy-tf.yml`
**Trigger**: Push to `main` branch (for infra changes) or manual dispatch

### Option 2: Manual Deployment with Terraform CLI

Deploy directly from your local machine using Terraform commands.

---

## Option 1: Automated Deployment via GitHub Actions

### Step 1: Azure Backend Storage Setup

The Terraform backend stores state files in Azure Storage with OIDC authentication enabled.

#### 1.1 Create Storage Account for Terraform State

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="rg-terraform-backend"
STORAGE_ACCOUNT="sttfstate$(openssl rand -hex 4)"  # Must be globally unique
CONTAINER_NAME="tfstate"
LOCATION="swedencentral"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS \
  --allow-blob-public-access false \
  --https-only true

# Disable key-based authentication (OIDC only)
az storage account update \
  --name $STORAGE_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --allow-shared-key-access false

# Create container for state files
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT \
  --auth-mode login
```

**Save these values** - you'll need them for GitHub secrets:
- Storage Account Name: `$STORAGE_ACCOUNT`
- Container Name: `tfstate`
- Resource Group: `rg-terraform-backend`

### Step 2: Azure AD Application Setup

Create an application and configure OIDC for GitHub Actions.

#### 2.1 Create Azure AD Application

```bash
# Create Azure AD application
az ad app create --display-name "finvibe-github-actions"
```

Note the `appId` from the output - this is your `AZURE_CLIENT_ID`.

#### 2.2 Create Service Principal and Configure OIDC

```bash
# Create service principal
az ad sp create --id <appId>

# Get your Azure tenant ID
az account show --query tenantId -o tsv

# Get your Azure subscription ID
az account show --query id -o tsv
```

#### 2.3 Configure Federated Credentials for GitHub

Set up OIDC trust between Azure and GitHub:

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

#### 2.4 Assign Azure Permissions

Grant the service principal access to your subscription and the Terraform backend:

Grant the service principal Contributor permissions:

```bash
# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role to subscription (for creating resources)
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# Assign Storage Blob Data Contributor for Terraform state
az role assignment create \
  --assignee <appId> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/rg-terraform-backend/providers/Microsoft.Storage/storageAccounts/$STORAGE_ACCOUNT
```

### Step 3: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<appId>` | Application (client) ID from Step 2.1 |
| `AZURE_TENANT_ID` | Your tenant ID | Azure AD tenant ID from Step 2.2 |
| `AZURE_SUBSCRIPTION_ID` | Your subscription ID | Azure subscription ID from Step 2.2 |
| `BACKEND_RESOURCE_GROUP` | `rg-terraform-backend` | Terraform backend resource group |
| `BACKEND_STORAGE_ACCOUNT` | `$STORAGE_ACCOUNT` | Terraform state storage account name |
| `BACKEND_CONTAINER_NAME` | `tfstate` | Terraform state container name |
| `BACKEND_KEY` | `finvibe.tfstate` | Terraform state file name |
| `RESEND_API_KEY` | Your Resend API key | (Optional) For email functionality |

### Step 4: Deploy via GitHub Actions

The deployment workflow (`.github/workflows/azure-deploy-tf.yml`) triggers automatically:

**Automatic Trigger:**
- Push to `main` branch with changes to `infra/` directory
- Pull request to `main` (plan only, no apply)

**Manual Trigger:**
1. Go to Actions tab in GitHub
2. Select "Deploy to Azure with Terraform"
3. Click "Run workflow"
4. Select branch (default: main)
5. Click "Run workflow"

**Workflow Steps:**
1. ✅ Checkout code
2. ✅ Setup Terraform
3. ✅ Initialize Terraform with Azure backend (OIDC authentication)
4. ✅ Plan infrastructure changes
5. ✅ Upload plan artifact
6. ✅ Apply changes (only on push to main)

**First Deployment:**
```bash
# Make a commit to trigger deployment
git add .
git commit -m "Initial Azure deployment"
git push origin main
```

Monitor the workflow in the Actions tab. The first deployment takes ~10-15 minutes.

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

### Container Configuration

The Terraform configuration automatically sets up the required environment variables for each container:

**Backend Container:**
- `NODE_ENV` - Set to "production"
- `PORT` - Internal port (3000)
- `DB_HOST` - PostgreSQL container FQDN
- `DB_*` - Database credentials from variables
- `JWT_SECRET` - From Terraform variables
- `CORS_ORIGIN` - Automatically set to the frontend URL

**Frontend Container:**
- `BACKEND_URL` - Automatically set to the backend's internal FQDN
  - This configures the nginx reverse proxy to forward `/api` requests to the backend
  - Example: `http://finvibe-backend.internal.xxx.azurecontainerapps.io`

**PostgreSQL Container:**
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` - From Terraform variables
- Persistent storage via Azure Files

The frontend nginx configuration uses runtime template substitution to inject the `BACKEND_URL`, allowing it to proxy API requests to the backend without hardcoding URLs at build time.

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
