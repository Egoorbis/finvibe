# Azure Deployment Guide

This guide explains how to deploy FinVibe to Azure Container Apps using GitHub Actions.

## Prerequisites

- An Azure account with an active subscription
- Azure CLI installed locally (for setup)
- Access to configure GitHub repository secrets

## Azure Infrastructure Setup

The deployment uses the following Azure services:
- **Azure Container Registry (ACR)** - Stores Docker images
- **Azure Container Apps** - Hosts the frontend and backend containers
- **Azure Container Apps Environment** - Provides the runtime environment

## Authentication Setup

The deployment workflow uses **OpenID Connect (OIDC)** authentication, which is the modern, secure method recommended by Azure and GitHub.

### Step 1: Create an Azure AD Application

1. Login to Azure CLI:
   ```bash
   az login
   ```

2. Create an Azure AD application:
   ```bash
   az ad app create --display-name "finvibe-github-actions"
   ```

   Note the `appId` from the output - this is your `AZURE_CLIENT_ID`.

3. Create a service principal for the application:
   ```bash
   az ad sp create --id <appId>
   ```

4. Get your Azure tenant ID:
   ```bash
   az account show --query tenantId -o tsv
   ```

5. Get your Azure subscription ID:
   ```bash
   az account show --query id -o tsv
   ```

### Step 2: Configure Federated Credentials

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

### Step 3: Assign Azure Permissions

Grant the service principal permissions to manage your Azure resources:

```bash
# Get the subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Assign Contributor role
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID
```

For more restrictive permissions, you can limit the scope to a specific resource group:

```bash
az role assignment create \
  --assignee <appId> \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/finvibe-rg
```

### Step 4: Configure GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `AZURE_CLIENT_ID` | `<appId>` | The Application (client) ID from Step 1 |
| `AZURE_TENANT_ID` | Your tenant ID | The Azure AD tenant ID from Step 1 |
| `AZURE_SUBSCRIPTION_ID` | Your subscription ID | The Azure subscription ID from Step 1 |

## Infrastructure Deployment

Before the GitHub Actions workflow can deploy the application, you need to create the Azure infrastructure:

### Create Resource Group

```bash
az group create \
  --name finvibe-rg \
  --location eastus
```

### Create Container Registry

```bash
az acr create \
  --resource-group finvibe-rg \
  --name finvibereg \
  --sku Basic \
  --admin-enabled true
```

### Create Container Apps Environment

```bash
az containerapp env create \
  --name finvibe-env \
  --resource-group finvibe-rg \
  --location eastus
```

### Create Container Apps

#### Backend App:
```bash
az containerapp create \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --environment finvibe-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 3000 \
  --ingress external \
  --registry-server finvibereg.azurecr.io \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars \
    NODE_ENV=production \
    PORT=3000
```

#### Frontend App:
```bash
az containerapp create \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --environment finvibe-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 80 \
  --ingress external \
  --registry-server finvibereg.azurecr.io \
  --cpu 0.5 \
  --memory 1.0Gi \
  --min-replicas 1 \
  --max-replicas 3
```

## Deployment Workflow

Once the infrastructure is set up, the GitHub Actions workflow (`.github/workflows/azure-deploy.yml`) will automatically:

1. Trigger on pushes to the `main` branch or manual dispatch
2. Authenticate with Azure using OIDC
3. Build Docker images for frontend and backend
4. Push images to Azure Container Registry
5. Update Container Apps with new images
6. Run database migrations
7. Display deployment URLs

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

### View Application URLs

```bash
# Get backend URL
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv

# Get frontend URL
az containerapp show \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

## Troubleshooting

### Authentication Errors

If you see errors like "Login failed with Error: Using auth-type: SERVICE_PRINCIPAL":

1. Verify all three secrets are set in GitHub: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
2. Ensure the federated credential subject matches your repository and branch
3. Verify the service principal has Contributor role on the subscription or resource group

### Container Registry Authentication

If container registry login fails:
```bash
# Ensure admin access is enabled
az acr update --name finvibereg --admin-enabled true

# Grant AcrPull role to the service principal
az role assignment create \
  --assignee <appId> \
  --role AcrPull \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/finvibe-rg/providers/Microsoft.ContainerRegistry/registries/finvibereg
```

### Container App Issues

Check container app status:
```bash
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.runningStatus
```

## Cost Management

To keep costs low:
- Container Apps scale to zero when not in use
- Use Basic SKU for Container Registry
- Monitor usage in Azure Portal under Cost Management

## Cleanup

To remove all Azure resources:
```bash
az group delete --name finvibe-rg --yes --no-wait
```

## Additional Resources

- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [GitHub Actions OIDC with Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/)

---

**Note**: This setup uses OIDC authentication which is more secure than storing credentials. No passwords or keys are stored in GitHub secrets.
