# Azure Container Apps with Azure Files - Implementation Guide

## What Was Done

This implementation adds **persistent storage** to the PostgreSQL container using Azure Files (Azure Storage Account) instead of ephemeral EmptyDir storage.

### Changes Made

1. **Created `infra/storage.tf`** - New file containing:
   - Storage Account for PostgreSQL data
   - Azure Files share (default 32GB)
   - Container Apps Environment Storage resource

2. **Updated `infra/main.tf`**:
   - Changed PostgreSQL volume from `EmptyDir` to `AzureFile`
   - Added dependency on storage resource

3. **Updated `infra/variables.tf`**:
   - Added `postgres_storage_account_name` variable
   - Added `postgres_storage_quota_gb` variable

4. **Updated `infra/terraform.tfvars.example`**:
   - Added storage configuration examples

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Container App                           │
│  ┌───────────────────────────────────────────────┐ │
│  │  Volume Mount: /var/lib/postgresql/data       │ │
│  │  ↓                                             │ │
│  │  AzureFile Volume                             │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Container App Environment Storage                   │
│  (Links Azure Files to Container Apps)              │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Azure Storage Account (Standard LRS)               │
│  ┌───────────────────────────────────────────────┐ │
│  │  Azure Files Share: postgres-data              │ │
│  │  Size: 32 GB (configurable)                   │ │
│  │  Persistent storage for PostgreSQL            │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Cost Breakdown

### Azure Files Standard (LRS)
- **Storage**: $0.06/GB/month
- **32 GB**: $1.92/month
- **64 GB**: $3.84/month
- **128 GB**: $7.68/month

### Transactions
- **Minimal**: ~$0.10-0.50/month for typical database operations

### Total Monthly Cost
- **32 GB**: **~$2-3/month**
- **64 GB**: **~$4-5/month**
- **128 GB**: **~$8-9/month**

## Deployment Steps

### 1. Update Configuration

Copy the example and update with your values:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars
```

**Important**: Update the `postgres_storage_account_name` to be globally unique:

```hcl
# Must be globally unique across all Azure
# 3-24 lowercase alphanumeric characters
postgres_storage_account_name = "stfinvibepg123abc"  # Change this!
postgres_storage_quota_gb     = 32                    # Start with 32GB
```

Generate a unique name:
```bash
# Option 1: Append random string
echo "stfinvibepg$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 8)"

# Option 2: Use timestamp
echo "stfinvibepg$(date +%s)"
```

### 2. Initialize Terraform

```bash
cd infra
terraform init
```

### 3. Plan Changes

```bash
terraform plan
```

**Expected new resources**:
- `azurerm_storage_account.postgres`
- `azurerm_storage_share.postgres_data`
- `azurerm_container_app_environment_storage.postgres`

**Expected changes**:
- `module.postgres_container_app` - Volume type changed from EmptyDir to AzureFile

### 4. Apply Changes

```bash
terraform apply
```

Review the plan and type `yes` to confirm.

### 5. Verify Deployment

```bash
# Check Container App status
az containerapp show \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --query "properties.provisioningState"

# Check storage account
az storage account show \
  --name <your-storage-account-name> \
  --resource-group finvibe-rg

# Check file share
az storage share show \
  --name postgres-data \
  --account-name <your-storage-account-name>
```

### 6. Initialize Database (First Time)

If this is a new deployment, run migrations:

```bash
# Get backend container app URL
BACKEND_URL=$(az containerapp show \
  --name finvibe-backend \
  --resource-group finvibe-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv)

# Check if migrations are needed
curl https://${BACKEND_URL}/health
```

The backend will automatically run migrations on startup if using the database connection.

## Data Migration (If Existing Data)

If you have existing data in the old PostgreSQL container, you need to migrate it:

### Option 1: Using pg_dump (Recommended)

```bash
# 1. Export data from old container
az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "pg_dump -U finvibe_user -d finvibe" > backup.sql

# 2. Deploy new infrastructure with Azure Files
terraform apply

# 3. Import data to new container
cat backup.sql | az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "psql -U finvibe_user -d finvibe"
```

### Option 2: During Deployment

If you don't have critical data yet, you can simply deploy and start fresh.

## Backup Strategy

### Manual Backup

```bash
# Create backup
az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "pg_dump -U finvibe_user finvibe" | gzip > finvibe_backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip -c finvibe_backup_20260408.sql.gz | \
az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "psql -U finvibe_user -d finvibe"
```

## Troubleshooting: Postgres fails to init on Azure Files (chmod / permission denied)

**Symptoms (container logs):**
```
chmod: /var/lib/postgresql/data/pgdata: Operation not permitted
initdb: error: could not change permissions of directory "/var/lib/postgresql/data/pgdata": Operation not permitted
```

**Why it happens:** Azure Files (SMB) does not allow arbitrary chmod/chown. Postgres `initdb` expects `PGDATA` to be owned by the postgres user with 0700 perms; if the mount is pre-created with different ownership/perms, initdb fails.

**Fix steps:**
1) Align `PGDATA` with the mount root  
   - Use `PGDATA=/var/lib/postgresql/data` (the mount path) or ensure the subdirectory is created by Postgres after mount. Avoid pre-creating `/var/lib/postgresql/data/pgdata` with wrong perms.

2) Match mount ownership to the postgres user  
   - Run the container as UID/GID 999 (default postgres image).  
   - Set Azure Files mount options to `uid=999,gid=999,dir_mode=0700,file_mode=0600,cache=strict` (Container Apps supports `mountOptions` on AzureFile volumes).

3) Start from a clean share  
   - If a previous attempt wrote files with wrong ownership, recreate or empty the `postgres-data` share, then redeploy.

4) Validate after redeploy  
   - Logs should no longer show chmod/initdb errors.  
   - From an exec session, `touch /var/lib/postgresql/data/testfile` should succeed; Postgres should start normally.

**Recommendation:** For higher IOPS and simpler permissions, consider Azure Disks for Postgres data. If staying on Azure Files, keep `cache=strict`, single replica, and consistent mount/PGDATA settings across revisions.

### Automated Backup

You can use Azure Backup for Files or set up a scheduled job:

```bash
# Azure CLI script to run daily
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "pg_dump -U finvibe_user finvibe" | \
  gzip > "${BACKUP_DIR}/finvibe_${DATE}.sql.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "finvibe_*.sql.gz" -mtime +7 -delete
```

## Scaling Storage

To increase storage size:

1. Update `terraform.tfvars`:
   ```hcl
   postgres_storage_quota_gb = 64  # Increased from 32
   ```

2. Apply changes:
   ```bash
   terraform apply
   ```

3. Storage will expand automatically (no downtime)

## Troubleshooting

### Storage Account Name Already Taken

**Error**: `StorageAccountAlreadyExists`

**Solution**: Change `postgres_storage_account_name` to a unique value:
```bash
# Generate new unique name
echo "stfinvibepg$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 8)"
```

### Container App Not Starting

**Check logs**:
```bash
az containerapp logs show \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --tail 50
```

**Common issues**:
- Storage not mounted: Check Container App Environment Storage resource
- Permissions: Verify storage account access key is correct
- PostgreSQL initialization: Check PGDATA path matches volume mount

### Data Not Persisting

**Verify volume mount**:
```bash
az containerapp show \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --query "properties.template.volumes"
```

Should show:
```json
[
  {
    "name": "postgres-data",
    "storageType": "AzureFile",
    "storageName": "postgres-storage"
  }
]
```

### Performance Issues

Azure Files Standard tier may have lower IOPS than expected. For better performance:

1. **Upgrade to Premium Files**:
   ```hcl
   # In storage.tf
   account_tier = "Premium"
   account_kind = "FileStorage"
   ```
   Cost: ~$0.15/GB/month (vs $0.06/GB for Standard)

2. **Monitor metrics**:
   ```bash
   az monitor metrics list \
     --resource <storage-account-id> \
     --metric Transactions
   ```

## Monitoring

### Storage Usage

```bash
# Check file share usage
az storage share stats \
  --name postgres-data \
  --account-name <your-storage-account-name>
```

### Container App Metrics

```bash
# CPU and Memory
az monitor metrics list \
  --resource <container-app-id> \
  --metric "CpuUsage,MemoryUsage"
```

### Database Size

```bash
# Connect to PostgreSQL
az containerapp exec \
  --name finvibe-postgres \
  --resource-group finvibe-rg \
  --command "psql -U finvibe_user -d finvibe -c \"SELECT pg_size_pretty(pg_database_size('finvibe'));\""
```

## Security Considerations

### Access Keys

- Storage account access keys are stored in Container App Environment Storage
- Keys are not exposed in environment variables
- Consider using Managed Identity for enhanced security (future improvement)

### Network Security

- Storage account has HTTPS-only enabled
- TLS 1.2 minimum version enforced
- Public blob access disabled

### Backup Encryption

- Azure Files data is encrypted at rest by default
- Backups should be stored securely (encrypted S3/Blob storage)

## Rolling Back

If you need to roll back to EmptyDir:

1. Backup your data first!
   ```bash
   az containerapp exec \
     --name finvibe-postgres \
     --resource-group finvibe-rg \
     --command "pg_dump -U finvibe_user finvibe" > rollback_backup.sql
   ```

2. Revert changes in `infra/main.tf`:
   ```hcl
   volumes = [{
     name         = "postgres-data"
     storage_type = "EmptyDir"
   }]
   ```

3. Apply:
   ```bash
   terraform apply
   ```

4. Note: Data will be lost unless restored from backup!

## Cost Monitoring

### Set up Cost Alerts

```bash
# Create budget alert
az consumption budget create \
  --amount 10 \
  --budget-name finvibe-storage \
  --category Cost \
  --time-grain Monthly \
  --resource-group finvibe-rg
```

### Review Costs

```bash
# Check current month costs
az consumption usage list \
  --start-date $(date -d "first day of this month" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d)
```

## Next Steps

After successful deployment:

1. ✅ Verify data persistence by restarting PostgreSQL container
2. ✅ Set up automated backups
3. ✅ Monitor storage usage and costs
4. ✅ Test restore procedure
5. ✅ Document connection strings for team

## Support Resources

- [Azure Files Documentation](https://learn.microsoft.com/azure/storage/files/)
- [Container Apps Storage Documentation](https://learn.microsoft.com/azure/container-apps/storage-mounts)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

**Implementation Date**: 2026-04-08
**Estimated Monthly Cost**: $2-3 for 32GB storage
**Benefits**: Persistent data, easy backups, portable across regions
