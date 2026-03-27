# GitHub Actions CI/CD Setup Guide

This document explains how to configure GitHub Actions for automated testing and deployment to Azure.

## Overview

The project includes two workflows:

1. **CI Workflow** (`ci.yml`) - Runs on pull requests and pushes to develop branch
   - Runs backend tests with PostgreSQL
   - Runs frontend tests
   - Builds Docker images to verify they work

2. **Deploy Workflow** (`azure-deploy.yml`) - Runs on pushes to main branch
   - Builds and pushes Docker images to Azure Container Registry
   - Deploys backend and frontend to Azure Container Apps
   - Runs database migrations
   - Reports deployment URLs

## Prerequisites

Before setting up GitHub Actions, you must:

1. ✅ Complete Azure infrastructure setup (see `AZURE_DEPLOYMENT.md`)
2. ✅ Create Azure service principal for GitHub Actions
3. ✅ Configure GitHub repository secrets

## Step 1: Create Azure Service Principal

Create a service principal with contributor access to your resource group:

```bash
az ad sp create-for-rbac \
  --name finvibe-github-actions \
  --role contributor \
  --scopes /subscriptions/{SUBSCRIPTION_ID}/resourceGroups/finvibe-rg \
  --sdk-auth
```

**Important**: Replace `{SUBSCRIPTION_ID}` with your actual Azure subscription ID.

This command will output JSON credentials like:

```json
{
  "clientId": "xxxx",
  "clientSecret": "xxxx",
  "subscriptionId": "xxxx",
  "tenantId": "xxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**Save this entire JSON output** - you'll need it for GitHub secrets.

## Step 2: Get Azure Container Registry Credentials

```bash
# Get ACR credentials
az acr credential show --name finvibereg

# Output will show:
# {
#   "passwords": [
#     {
#       "name": "password",
#       "value": "xxxxxxxx"
#     },
#     {
#       "name": "password2",
#       "value": "xxxxxxxx"
#     }
#   ],
#   "username": "finvibereg"
# }
```

## Step 3: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add the following secrets:

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_CREDENTIALS` | Service principal credentials | Output from Step 1 (entire JSON) |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID | From Step 1 JSON or `az account show --query id -o tsv` |
| `ACR_USERNAME` | Container registry username | From Step 2 (usually same as ACR name) |
| `ACR_PASSWORD` | Container registry password | From Step 2 (use password or password2 value) |

### How to Add Each Secret

1. Click "New repository secret"
2. Enter the name exactly as shown above
3. Paste the value
4. Click "Add secret"

## Step 4: Verify Workflows

### Check CI Workflow

1. Create a new branch: `git checkout -b test-ci`
2. Make a small change to any file
3. Commit and push: `git push -u origin test-ci`
4. Create a pull request to `main`
5. GitHub Actions will automatically run the CI workflow
6. Check the "Actions" tab to see the workflow running

### Test Deployment Workflow

**⚠️ Warning**: This will deploy to production!

1. Merge a PR to `main` branch
2. GitHub Actions will automatically:
   - Build Docker images
   - Push to Azure Container Registry
   - Deploy to Azure Container Apps
   - Run database migrations
3. Check the "Actions" tab for deployment status and URLs

## Step 5: Manual Deployment Trigger

You can also trigger deployments manually:

1. Go to "Actions" tab in GitHub
2. Select "Deploy to Azure" workflow
3. Click "Run workflow"
4. Select branch (default: main)
5. Click "Run workflow"

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers**:
- Pull requests to `main`
- Pushes to `develop` branch

**Jobs**:
1. **backend-tests**: Runs backend tests with PostgreSQL service
2. **frontend-tests**: Runs frontend tests and builds
3. **docker-build**: Builds Docker images to verify they work

**Duration**: ~5-10 minutes

### Deploy Workflow (`azure-deploy.yml`)

**Triggers**:
- Pushes to `main` branch
- Manual trigger via GitHub Actions UI

**Jobs**:
1. Build and push backend Docker image (tagged with commit SHA and `latest`)
2. Build and push frontend Docker image (tagged with commit SHA and `latest`)
3. Update backend Container App with new image
4. Update frontend Container App with new image
5. Run database migrations
6. Display deployment URLs

**Duration**: ~8-15 minutes

## Environment Variables

The workflows use these environment variables (defined in workflow files):

```yaml
AZURE_RESOURCE_GROUP: finvibe-rg
AZURE_LOCATION: eastus
ACR_NAME: finvibereg
BACKEND_APP_NAME: finvibe-backend
FRONTEND_APP_NAME: finvibe-frontend
CONTAINER_ENV_NAME: finvibe-env
```

**Important**: If you used different names during Azure setup, update these in:
- `.github/workflows/azure-deploy.yml`

## Monitoring Deployments

### View Workflow Logs

1. Go to "Actions" tab in your GitHub repository
2. Click on a workflow run
3. Click on a job to see detailed logs
4. Expand steps to see command output

### Check Deployment Status

After deployment completes, the workflow shows:
- ✅ Backend URL
- ✅ Frontend URL

Visit these URLs to verify the deployment.

### Azure Portal Monitoring

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your resource group: `finvibe-rg`
3. Click on Container Apps to see:
   - Revision history
   - Application logs
   - Metrics

## Troubleshooting

### Problem: "Error: Login failed with Error: Unable to authenticate"

**Solution**:
1. Verify `AZURE_CREDENTIALS` secret is set correctly
2. Ensure service principal hasn't expired
3. Recreate service principal (Step 1) and update secret

### Problem: "Error: docker login failed"

**Solution**:
1. Verify `ACR_USERNAME` and `ACR_PASSWORD` are correct
2. Run Step 2 again to get fresh credentials
3. Ensure ACR admin is enabled:
   ```bash
   az acr update --name finvibereg --admin-enabled true
   ```

### Problem: "Container app not found"

**Solution**:
1. Verify Azure resources exist:
   ```bash
   az containerapp list --resource-group finvibe-rg -o table
   ```
2. Ensure you completed initial deployment (see `AZURE_DEPLOYMENT.md`)
3. Check workflow environment variables match your resource names

### Problem: Database migrations fail

**Solution**:
1. Check backend logs:
   ```bash
   az containerapp logs show \
     --name finvibe-backend \
     --resource-group finvibe-rg \
     --follow
   ```
2. Verify PostgreSQL container is running:
   ```bash
   az container show \
     --resource-group finvibe-rg \
     --name finvibe-postgres \
     --query instanceView.state
   ```
3. Run migrations manually (see `AZURE_DEPLOYMENT.md` Step 7)

### Problem: Frontend shows "API connection failed"

**Solution**:
1. Check backend is running and accessible
2. Verify frontend `VITE_API_URL` environment variable:
   ```bash
   az containerapp show \
     --name finvibe-frontend \
     --resource-group finvibe-rg \
     --query properties.template.containers[0].env
   ```
3. Update frontend with correct backend URL if needed

## Security Best Practices

1. ✅ **Never commit secrets** to Git
2. ✅ Use GitHub secrets for all sensitive data
3. ✅ Rotate service principal credentials regularly
4. ✅ Use least privilege access (contributor role only on resource group)
5. ✅ Enable branch protection on `main` branch
6. ✅ Require PR reviews before merging
7. ✅ Enable "Require status checks to pass" in branch protection

## Cost Optimization

GitHub Actions usage:
- **Free tier**: 2,000 minutes/month for private repos
- **This project**: ~10-15 minutes per deployment
- **Estimate**: ~100-200 deployments/month within free tier

Azure costs remain the same as documented in `AZURE_DEPLOYMENT.md`.

## Updating Workflows

To modify workflows:

1. Edit workflow files in `.github/workflows/`
2. Test changes on a feature branch first
3. Verify in PR that CI passes
4. Merge to main

Common modifications:
- Add more test steps
- Add security scanning (e.g., Snyk, Trivy)
- Add Slack/Discord notifications
- Add deployment approvals for production

## Next Steps

After setting up CI/CD:

1. ✅ Enable branch protection on `main`
2. ✅ Configure required status checks
3. ✅ Set up deployment notifications
4. ✅ Add monitoring alerts in Azure
5. ✅ Document deployment process for team

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions tab
2. Check Azure Container Apps logs
3. Review `AZURE_DEPLOYMENT.md` for Azure-specific issues
4. Check GitHub Actions documentation: https://docs.github.com/en/actions
