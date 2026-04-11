# Azure Container Apps with Premium Azure Files for PostgreSQL

## What Changed

- PostgreSQL persistent storage now uses a premium Azure Files share (FileStorage) instead of a managed disk, aligning with supported Container Apps storage APIs.
- Environment storage is defined as an Azure Files mount via `Microsoft.App/managedEnvironments/storages`.
- The only input remains the storage quota (`postgres_disk_size_gb`), now applied to the Azure Files share.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Container App                           │
│  ┌───────────────────────────────────────────────┐ │
│  │  Volume Mount: /var/lib/postgresql/data       │ │
│  │  ↓                                             │ │
│  │  AzureFile Volume (Premium FileStorage)        │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Container App Environment Storage (AzureFile)      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Azure Storage Account (FileStorage, Premium LRS)   │
│  - Azure Files share quota: postgres_disk_size_gb   │
│  - Access via storage account key (mounted by ACA)  │
└─────────────────────────────────────────────────────┘
```

## Configuration

In `infra/terraform.tfvars`:

```hcl
# Azure Files share quota in GB (Premium FileStorage)
postgres_disk_size_gb = 64
```

Premium FileStorage is used for lower latency and higher IOPS for PostgreSQL data.

## Deployment Notes

1. `terraform init`
2. `terraform validate`
3. `terraform plan`
4. `terraform apply`

## Data Migration

If migrating from the previous managed disk or Azure Files setup:
- Take a `pg_dump` from the old deployment.
- Apply the updated Azure Files-backed deployment.
- Restore the dump into the new PostgreSQL container.
