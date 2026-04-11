# Azure Container Apps with Managed Disk for PostgreSQL

## What Changed

- Switched PostgreSQL persistent storage from Azure Files to an Azure Managed Disk for better durability and IOPS.
- Replaced the Azure Files environment storage with a Managed Disk-backed storage on the Container Apps environment (via `azapi_resource`).
- Simplified configuration: only the managed disk size (`postgres_disk_size_gb`) is required.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Container App                           │
│  ┌───────────────────────────────────────────────┐ │
│  │  Volume Mount: /var/lib/postgresql/data       │ │
│  │  ↓                                             │ │
│  │  ManagedDisk Volume (Premium_LRS)             │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Container App Environment Storage (ManagedDisk)    │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Azure Managed Disk (create option: Empty)          │
│  - Size: postgres_disk_size_gb (default 64 GB)      │
│  - SKU: Premium_LRS                                 │
└─────────────────────────────────────────────────────┘
```

## Configuration

In `infra/terraform.tfvars`:

```hcl
# Managed disk size in GB (Premium SSD LRS)
postgres_disk_size_gb = 64
```

Premium_LRS is used by default for better latency/IOPS for PostgreSQL.

## Deployment Notes

1. `terraform init`
2. `terraform validate`
3. `terraform plan`
4. `terraform apply`

## Data Migration

If migrating from the previous Azure Files-backed storage:
- Take a pg_dump from the old deployment.
- Apply the new Managed Disk deployment.
- Restore the dump into the new PostgreSQL container.
