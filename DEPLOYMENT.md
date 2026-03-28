# Finvibe Deployment Guide

## Overview

The deployment process uses GitHub Actions to orchestrate:
1. **Infrastructure Setup** - Terraform deploys Azure resources
2. **Image Building** - Docker builds and pushes backend/frontend to ACR
3. **App Deployment** - Updates Container Apps with new images

## Workflows

### Main Deployment Workflow (`azure-deploy-terraform.yml`)
**Recommended for production deployments**

Triggers on:
- Push to `main` branch
- Pull request to `main` (plan only)
- Manual dispatch

Process:
1. **terraform-plan** - Validates and plans infrastructure changes
2. **terraform-apply** - Applies infrastructure
3. **build-and-deploy** - Builds images, pushes to ACR, updates Container Apps

### Image Push Workflow (`push-images.yml`)
**For image-only updates without infrastructure changes**

Use when:
- You want to update container images without changing infrastructure
- Backend/frontend code updated but Azure resources unchanged

Triggers on:
- Push to `main` branch
- Manual dispatch

## Prerequisites

### GitHub Secrets
Configure these in your GitHub repository settings:
- `AZURE_CLIENT_ID` - Service Principal Client ID
- `AZURE_TENANT_ID` - Azure Tenant ID
- `AZURE_SUBSCRIPTION_ID` - Azure Subscription ID

### Azure Permissions
Service Principal needs:
- **Terraform**: Permissions to create/modify resources in `rg-base-container` resource group
- **ACR**: `AcrPush` role on `metrreg` ACR
- **Container Apps**: Permissions to update container apps

Assign with:
```bash
# Terraform (Contributor at resource group level)
az role assignment create \
  --assignee <CLIENT_ID> \
  --role Contributor \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-base-container

# ACR Push
az role assignment create \
  --assignee <CLIENT_ID> \
  --role AcrPush \
  --scope /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/rg-base-container/providers/Microsoft.ContainerRegistry/registries/metrreg
```

## Terraform Configuration

**Location**: `./infra/`

**Key Resources**:
- Container Apps Environment
- Backend Container App (Node.js)
- Frontend Container App (React/Vite)
- Log Analytics Workspace
- ACR access configuration

**Variables** (with defaults):
- `resource_group_name` = "finvibe-rg"
- `location` = "swedencentral"
- `backend_min_replicas` = 1
- `frontend_max_replicas` = 1

Override using GitHub Actions environment variables or `terraform.tfvars`.

## Deployment Flow Diagram

```
Push to main
    ↓
terraform-plan (validation)
    ↓
[PR: Approve] → terraform-apply (infrastructure)
    ↓
build-and-deploy (images + Container Apps)
    ↓
✅ Live at:
   - Backend: https://<backend-fqdn>/api
   - Frontend: https://<frontend-fqdn>
```

## Troubleshooting

### Workflow fails with "denied: requested access to the resource is denied"
- Check service principal has `AcrPush` role on ACR
- Verify `az acr login` succeeds locally

### Terraform apply fails
- Ensure service principal has `Contributor` role on resource group
- Check for resource name conflicts in Azure

### Container Apps not updating
- Check Container App names in Terraform outputs match deployment
- Verify service principal can update Container Apps

## Manual Deployments

To deploy manually without GitHub Actions:

```bash
# 1. Authenticate
az login

# 2. Terraform
cd infra
terraform init
terraform plan
terraform apply

# 3. Build and push images
az acr login --name metrreg
docker build -t metrreg-g3f3hxgzfbfkfxhk.azurecr.io/finvibe-backend:latest ./backend
docker push metrreg-g3f3hxgzfbfkfxhk.azurecr.io/finvibe-backend:latest
# ... repeat for frontend

# 4. Update Container Apps
az containerapp update --name finvibe-backend --resource-group finvibe-rg \
  --image metrreg-g3f3hxgzfbfkfxhk.azurecr.io/finvibe-backend:latest
```

## Environment Variables

Available in both workflows:

- `ACR_NAME` = metrreg
- `ACR_LOGIN_SERVER` = metrreg-g3f3hxgzfbfkfxhk.azurecr.io
- `AZURE_RESOURCE_GROUP` = rg-base-container
