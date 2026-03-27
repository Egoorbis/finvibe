# Azure Deployment Guide for FinVibe

## Prerequisites

1. **Azure CLI** installed and configured
2. **Azure Subscription** with appropriate permissions
3. **Docker** installed locally
4. **GitHub repository** with Actions enabled
5. **Azure Container Registry** (ACR) created

## Architecture

- **Azure Container Apps** - For backend and frontend containers
- **PostgreSQL Container** - Self-managed in Azure Container Instances
- **Azure Key Vault** - For secrets management
- **Azure Application Insights** - For monitoring
- **Resend** - For email services (free tier: 100 emails/day)

## Step 1: Set Up Azure Resources

### 1.1 Create Resource Group

```bash
az group create \
  --name finvibe-rg \
  --location eastus
```

### 1.2 Create Azure Container Registry (ACR)

```bash
az acr create \
  --resource-group finvibe-rg \
  --name finvibereg \
  --sku Basic \
  --admin-enabled true
```

Get ACR credentials:
```bash
az acr credential show --name finvibereg
```

### 1.3 Create Azure Container Apps Environment

```bash
az extension add --name containerapp --upgrade

az containerapp env create \
  --name finvibe-env \
  --resource-group finvibe-rg \
  --location eastus
```

### 1.4 Create Azure Key Vault

```bash
az keyvault create \
  --name finvibe-kv \
  --resource-group finvibe-rg \
  --location eastus
```

### 1.5 Add Secrets to Key Vault

```bash
# Database password
az keyvault secret set \
  --vault-name finvibe-kv \
  --name db-password \
  --value "your-secure-password"

# JWT Secret
az keyvault secret set \
  --vault-name finvibe-kv \
  --name jwt-secret \
  --value "your-jwt-secret"

# Resend API Key
az keyvault secret set \
  --vault-name finvibe-kv \
  --name resend-api-key \
  --value "re_your_api_key_here"
```

## Step 2: Deploy PostgreSQL Container

```bash
az container create \
  --resource-group finvibe-rg \
  --name finvibe-postgres \
  --image postgres:16-alpine \
  --dns-name-label finvibe-postgres \
  --ports 5432 \
  --environment-variables \
    POSTGRES_DB=finvibe \
    POSTGRES_USER=finvibe_user \
  --secure-environment-variables \
    POSTGRES_PASSWORD=$(az keyvault secret show --vault-name finvibe-kv --name db-password --query value -o tsv) \
  --cpu 1 \
  --memory 2 \
  --restart-policy Always
```

Get PostgreSQL IP:
```bash
az container show \
  --resource-group finvibe-rg \
  --name finvibe-postgres \
  --query ipAddress.fqdn \
  --output tsv
```

## Step 3: Build and Push Docker Images

### 3.1 Login to ACR

```bash
az acr login --name finvibereg
```

### 3.2 Build and Push Backend

```bash
cd backend
docker build -t finvibereg.azurecr.io/finvibe-backend:latest .
docker push finvibereg.azurecr.io/finvibe-backend:latest
```

### 3.3 Build and Push Frontend

```bash
cd frontend
docker build -t finvibereg.azurecr.io/finvibe-frontend:latest .
docker push finvibereg.azurecr.io/finvibe-frontend:latest
```

## Step 4: Deploy Container Apps

### 4.1 Deploy Backend Container App

```bash
az containerapp create \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --environment finvibe-env \
  --image finvibereg.azurecr.io/finvibe-backend:latest \
  --target-port 3000 \
  --ingress external \
  --registry-server finvibereg.azurecr.io \
  --registry-username $(az acr credential show --name finvibereg --query username -o tsv) \
  --registry-password $(az acr credential show --name finvibereg --query passwords[0].value -o tsv) \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    DB_TYPE=postgres \
    DB_HOST=finvibe-postgres.eastus.azurecontainer.io \
    DB_PORT=5432 \
    DB_NAME=finvibe \
    DB_USER=finvibe_user \
  --secrets \
    db-password=$(az keyvault secret show --vault-name finvibe-kv --name db-password --query value -o tsv) \
    jwt-secret=$(az keyvault secret show --vault-name finvibe-kv --name jwt-secret --query value -o tsv) \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3
```

### 4.2 Get Backend URL

```bash
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv
```

### 4.3 Deploy Frontend Container App

```bash
BACKEND_URL=$(az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.configuration.ingress.fqdn \
  --output tsv)

az containerapp create \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --environment finvibe-env \
  --image finvibereg.azurecr.io/finvibe-frontend:latest \
  --target-port 80 \
  --ingress external \
  --registry-server finvibereg.azurecr.io \
  --registry-username $(az acr credential show --name finvibereg --query username -o tsv) \
  --registry-password $(az acr credential show --name finvibereg --query passwords[0].value -o tsv) \
  --env-vars \
    VITE_API_URL=https://$BACKEND_URL/api \
  --cpu 0.25 \
  --memory 0.5Gi \
  --min-replicas 1 \
  --max-replicas 2
```

## Step 5: Set Up Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app finvibe-insights \
  --location eastus \
  --resource-group finvibe-rg

# Get Instrumentation Key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app finvibe-insights \
  --resource-group finvibe-rg \
  --query instrumentationKey \
  --output tsv)

# Update backend with Application Insights
az containerapp update \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --set-env-vars \
    APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=$INSTRUMENTATION_KEY"
```

## Step 6: Configure Custom Domain (Optional)

### 6.1 Add Custom Domain

```bash
az containerapp hostname add \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --hostname app.yourdomain.com
```

### 6.2 Enable HTTPS

```bash
az containerapp hostname bind \
  --name finvibe-frontend \
  --resource-group finvibe-rg \
  --hostname app.yourdomain.com \
  --environment finvibe-env \
  --validation-method CNAME
```

## Step 7: Database Migration

```bash
# Get backend container name
CONTAINER_NAME=$(az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.template.containers[0].name \
  --output tsv)

# Run migrations
az containerapp exec \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --command "/bin/sh" \
  --args "-c 'npm run db:migrate && npm run db:seed'"
```

## Step 8: GitHub Actions Setup

### 8.1 Create Service Principal

```bash
az ad sp create-for-rbac \
  --name finvibe-github-actions \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/finvibe-rg \
  --sdk-auth
```

### 8.2 Add GitHub Secrets

Add these secrets to your GitHub repository:
- `AZURE_CREDENTIALS` - Output from service principal creation
- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID
- `ACR_USERNAME` - ACR username
- `ACR_PASSWORD` - ACR password
- `ACR_LOGIN_SERVER` - finvibereg.azurecr.io

## Monitoring

### View Logs

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

### Application Insights

Access Application Insights dashboard:
```bash
az monitor app-insights component show \
  --app finvibe-insights \
  --resource-group finvibe-rg \
  --query appId \
  --output tsv
```

Visit: https://portal.azure.com/#@/resource/...

## Scaling

### Manual Scaling

```bash
az containerapp update \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --min-replicas 2 \
  --max-replicas 5
```

### Auto-scaling Rules

```bash
az containerapp update \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --scale-rule-name http-scaling \
  --scale-rule-type http \
  --scale-rule-http-concurrency 50
```

## Cost Optimization

1. **Use Consumption Plan** for Container Apps
2. **Scale to Zero** during off-hours
3. **Use Basic SKU** for ACR
4. **Monitor costs** in Azure Cost Management

## Backup and Recovery

### Database Backup

```bash
# Export database
az container exec \
  --resource-group finvibe-rg \
  --name finvibe-postgres \
  --exec-command "/bin/sh -c 'pg_dump -U finvibe_user finvibe > /backup/finvibe-$(date +%Y%m%d).sql'"
```

## Troubleshooting

### Check Container Status

```bash
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.runningStatus
```

### Restart Container

```bash
az containerapp restart \
  --name finvibe-backend \
  --resource-group finvibe-rg
```

### View Environment Variables

```bash
az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query properties.template.containers[0].env
```

## Security Best Practices

1. **Use Key Vault** for all secrets
2. **Enable private endpoints** for Container Apps
3. **Configure network security groups**
4. **Enable Azure DDoS Protection**
5. **Regular security updates** for container images
6. **Use managed identities** instead of service principals
7. **Enable audit logging**

## Maintenance

### Update Container Images

```bash
# Build new image
docker build -t finvibereg.azurecr.io/finvibe-backend:v2 .
docker push finvibereg.azurecr.io/finvibe-backend:v2

# Update container app
az containerapp update \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --image finvibereg.azurecr.io/finvibe-backend:v2
```

## Estimated Monthly Costs

- Container Apps: ~$15-30/month
- Container Instances (PostgreSQL): ~$15-20/month
- Container Registry: ~$5/month
- Application Insights: ~$5-10/month
- Key Vault: ~$1/month
- **Total: ~$40-65/month**

## Support

For issues, check:
1. Container App logs
2. Application Insights
3. Azure Service Health
4. GitHub Actions workflow logs
