# FinVibe Permanent Storage Plan
## Azure PostgreSQL Database Implementation

### Executive Summary
This plan outlines the migration from ephemeral storage (EmptyDir) to permanent storage using **Azure Database for PostgreSQL Flexible Server**. Based on Azure pricing analysis for the East US region, we recommend the **Burstable B1ms tier** as the most cost-effective option for development/staging environments.

---

## Current State Analysis

### Existing Infrastructure
- **Database**: PostgreSQL 16 running in Azure Container App
- **Storage**: EmptyDir (ephemeral, data lost on restart)
- **Location**: East US
- **Current Resources**:
  - CPU: 0.5 vCore
  - Memory: 1Gi
  - No persistent storage

### Problems with Current Setup
1. **Data Loss**: All data is lost when the container restarts
2. **No Backups**: Cannot perform backups of ephemeral storage
3. **Scalability**: Cannot scale database independently from application
4. **Reliability**: No high availability or disaster recovery
5. **Compliance**: Cannot meet data retention requirements

---

## Azure PostgreSQL Pricing Analysis (East US Region)

### Recommended Option: Burstable B1ms Tier ✅

**Monthly Cost Estimate: ~$12.41 + storage**

#### Compute Pricing
- **SKU**: B1ms (Burstable Tier)
- **vCores**: 1 vCore
- **Cost**: $0.017/hour = **$12.41/month** (730 hours)
- **Memory**: 2 GiB RAM

#### Storage Pricing
- **Storage**: $0.115/GB/month
- **32 GB**: $3.68/month
- **64 GB**: $7.36/month
- **128 GB**: $14.72/month

#### Backup Storage
- **Backup Storage LRS**: $0.095/GB/month
- **Included**: Up to 100% of provisioned storage free
- **Example**: 32GB storage = 32GB free backup

#### IOPS
- **Included**: 400 IOPS (burstable to 2,000)
- **Additional IOPS**: $0.05 per IOPS/month if needed

**Total Monthly Cost Examples:**
- **Basic (32GB storage)**: $12.41 + $3.68 = **$16.09/month**
- **Medium (64GB storage)**: $12.41 + $7.36 = **$19.77/month**
- **Large (128GB storage)**: $12.41 + $14.72 = **$27.13/month**

---

### Alternative Options Comparison

#### Option 2: Burstable B2s Tier
- **Compute**: $0.068/hour = **$49.64/month**
- **vCores**: 2 vCores
- **Memory**: 4 GiB RAM
- **Use Case**: Medium traffic applications
- **Total (64GB)**: ~$57/month

#### Option 3: General Purpose D2ds_v5
- **Compute**: $0.178/hour = **$129.94/month**
- **vCores**: 2 vCores
- **Memory**: 8 GiB RAM
- **Use Case**: Production workloads with consistent performance
- **Total (64GB)**: ~$137/month

#### Option 4: Memory Optimized E2ds_v5
- **Compute**: $0.25/hour = **$182.50/month**
- **vCores**: 2 vCores
- **Memory**: 16 GiB RAM
- **Use Case**: Memory-intensive workloads
- **Total (64GB)**: ~$190/month

---

## Recommended Implementation Approach

### Phase 1: Infrastructure Setup with Terraform

#### 1.1 Add Azure PostgreSQL Flexible Server Module
Use the Azure Verified Module (AVM) for PostgreSQL:

```hcl
module "postgresql_flexible_server" {
  source  = "Azure/avm-res-dbforpostgresql-flexibleserver/azurerm"
  version = "~> 0.3.0"  # Use latest stable version

  name                = "finvibe-postgres-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  # Authentication
  administrator_login    = "finvibe_admin"
  administrator_password = var.postgres_admin_password  # Use Azure Key Vault

  # Compute Configuration - Burstable B1ms (cheapest option)
  sku_name = "B_Standard_B1ms"

  # Storage Configuration
  storage_mb            = 32768  # 32 GB
  storage_tier          = "P4"   # Performance tier
  backup_retention_days = 7      # Default backup retention

  # High Availability (disable for dev/staging to save costs)
  high_availability {
    mode = "Disabled"
  }

  # PostgreSQL Version
  version = "16"

  # Network Configuration - Private access only
  delegated_subnet_id = azurerm_subnet.postgres_subnet.id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  # Maintenance Window
  maintenance_window {
    day_of_week  = 0  # Sunday
    start_hour   = 2
    start_minute = 0
  }

  # Firewall Rules - None needed with private endpoint
  firewall_rules = {}

  tags = var.tags
}
```

#### 1.2 Network Configuration
Create dedicated subnet for PostgreSQL:

```hcl
# Virtual Network (if not exists)
resource "azurerm_virtual_network" "main" {
  name                = "vnet-finvibe-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]

  tags = var.tags
}

# Subnet for PostgreSQL
resource "azurerm_subnet" "postgres_subnet" {
  name                 = "snet-postgres"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.2.0/24"]

  delegation {
    name = "postgres-delegation"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Private DNS Zone
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

# Link DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-dns-link"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id

  tags = var.tags
}
```

#### 1.3 Key Vault for Secrets
Store database credentials securely:

```hcl
# Key Vault
resource "azurerm_key_vault" "main" {
  name                = "kv-finvibe-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  tags = var.tags
}

# Store PostgreSQL Admin Password
resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-admin-password"
  value        = random_password.postgres_admin.result
  key_vault_id = azurerm_key_vault.main.id
}

# Store Application Database Password
resource "azurerm_key_vault_secret" "app_db_password" {
  name         = "postgres-app-password"
  value        = random_password.postgres_app.result
  key_vault_id = azurerm_key_vault.main.id
}

# Generate Passwords
resource "random_password" "postgres_admin" {
  length  = 32
  special = true
}

resource "random_password" "postgres_app" {
  length  = 32
  special = true
}
```

### Phase 2: Database Migration Strategy

#### 2.1 Data Migration Steps
1. **Pre-Migration**:
   - Run migrations on new Azure PostgreSQL instance
   - Create application database and user
   - Test connection from Container App

2. **Migration**:
   - Export data from current container (if any exists)
   - Import into Azure PostgreSQL
   - Verify data integrity

3. **Cutover**:
   - Update backend container app environment variables
   - Point to new database endpoint
   - Deploy updated configuration
   - Verify application functionality

#### 2.2 Database Setup SQL
```sql
-- Create application database
CREATE DATABASE finvibe;

-- Create application user
CREATE USER finvibe_app WITH PASSWORD '<secure-password>';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE finvibe TO finvibe_app;

-- Connect to finvibe database
\c finvibe

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO finvibe_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO finvibe_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO finvibe_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO finvibe_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO finvibe_app;
```

### Phase 3: Application Configuration Updates

#### 3.1 Backend Container App Updates
Update environment variables to use Azure PostgreSQL:

```hcl
module "backend_container_app" {
  # ... existing configuration ...

  template = {
    containers = [{
      # ... existing container config ...

      env = [
        {
          name  = "DB_TYPE"
          value = "postgres"
        },
        {
          name  = "DB_HOST"
          value = module.postgresql_flexible_server.fqdn
        },
        {
          name  = "DB_PORT"
          value = "5432"
        },
        {
          name  = "DB_NAME"
          value = "finvibe"
        },
        {
          name  = "DB_USER"
          value = "finvibe_app"
        },
        {
          name        = "DB_PASSWORD"
          secret_name = "postgres-app-password"
        },
        # SSL Configuration
        {
          name  = "DB_SSL_MODE"
          value = "require"
        },
        # ... other env vars ...
      ]
    }]
  }

  # Add secrets from Key Vault
  secrets = [
    {
      name              = "postgres-app-password"
      key_vault_secret_id = azurerm_key_vault_secret.app_db_password.id
    }
  ]
}
```

#### 3.2 Remove Postgres Container App
Delete the postgres_container_app module from main.tf since we'll use the managed service.

### Phase 4: Backup and Disaster Recovery

#### 4.1 Automated Backups
Azure PostgreSQL Flexible Server provides:
- **Automatic backups**: Daily full backups
- **Retention**: 7-35 days (we'll use 7 days for cost efficiency)
- **Point-in-time restore**: Restore to any point within retention period
- **Geo-redundant backups**: Optional (adds cost, ~2x backup storage cost)

#### 4.2 Manual Backup Strategy
```bash
# Create manual backup
pg_dump -h <server>.postgres.database.azure.com \
        -U finvibe_admin \
        -d finvibe \
        -F c \
        -f finvibe_backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -h <server>.postgres.database.azure.com \
           -U finvibe_admin \
           -d finvibe \
           -c \
           finvibe_backup_20260408.dump
```

---

## Implementation Timeline

### Week 1: Infrastructure Setup
- [ ] Create Azure PostgreSQL Terraform configuration
- [ ] Set up Virtual Network and subnets
- [ ] Configure Private DNS Zone
- [ ] Create Key Vault and store secrets
- [ ] Deploy PostgreSQL Flexible Server

### Week 2: Database Configuration
- [ ] Run database migrations on new instance
- [ ] Create application database and user
- [ ] Test connectivity from Container Apps environment
- [ ] Configure SSL/TLS connections
- [ ] Set up monitoring and alerts

### Week 3: Application Migration
- [ ] Update backend container app configuration
- [ ] Deploy changes to development environment
- [ ] Test application functionality
- [ ] Verify data persistence across restarts
- [ ] Performance testing

### Week 4: Production Deployment
- [ ] Create production database instance
- [ ] Migrate production data (if any)
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Document runbook and procedures

---

## Cost Optimization Strategies

### Immediate Savings
1. **Use Burstable Tier**: B1ms for dev/staging (~$16/month vs $130/month for General Purpose)
2. **Right-size Storage**: Start with 32GB, increase as needed
3. **Disable High Availability**: For non-production environments
4. **Use Standard Backup**: LRS instead of GRS saves 50% on backup costs

### Long-term Optimization
1. **Reserved Instances**: 1-year reservation saves ~30%, 3-year saves ~60%
2. **Auto-pause**: Enable for dev environments (pause during non-business hours)
3. **Storage Tiers**: Use appropriate performance tier (P4, P6, P10, etc.)
4. **Monitoring**: Set up alerts for high resource usage

### Cost Comparison Matrix

| Tier | Environment | Monthly Cost | Savings vs GP |
|------|-------------|--------------|---------------|
| B1ms (32GB) | Dev/Test | $16.09 | $121 (88%) |
| B2s (64GB) | Staging | $57.00 | $80 (58%) |
| D2ds_v5 (128GB) | Production | $152.00 | Baseline |
| E2ds_v5 (128GB) | High Memory | $197.00 | -$45 (-23%) |

---

## Security Considerations

### Network Security
- ✅ **Private Endpoints**: No public IP exposure
- ✅ **VNet Integration**: Database in isolated subnet
- ✅ **NSG Rules**: Restrict traffic to Container Apps only
- ✅ **SSL/TLS**: Enforce encrypted connections

### Access Control
- ✅ **Azure AD Authentication**: Enable for admin access
- ✅ **Least Privilege**: Separate admin and app users
- ✅ **Key Vault**: Store all credentials securely
- ✅ **Managed Identity**: Use for Key Vault access

### Compliance
- ✅ **Encryption at Rest**: Enabled by default
- ✅ **Encryption in Transit**: SSL/TLS required
- ✅ **Audit Logging**: Enable for compliance
- ✅ **Backup Encryption**: Automatic

---

## Monitoring and Alerting

### Key Metrics to Monitor
1. **CPU Utilization**: Alert if >80% for 5 minutes
2. **Memory Usage**: Alert if >85%
3. **Storage Usage**: Alert if >80%
4. **Connection Count**: Alert if >80% of max
5. **Replication Lag**: If HA enabled
6. **Failed Connections**: Security indicator

### Azure Monitor Configuration
```hcl
resource "azurerm_monitor_metric_alert" "postgres_cpu" {
  name                = "postgres-high-cpu"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [module.postgresql_flexible_server.resource_id]
  description         = "Alert when CPU exceeds 80%"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }
}
```

---

## Rollback Plan

### If Migration Fails
1. **Keep old container**: Don't delete until confirmed working
2. **Database snapshots**: Take snapshot before migration
3. **Quick rollback**: Revert environment variables
4. **Data export**: Keep backup of all data

### Rollback Steps
```bash
# 1. Stop new configuration
az containerapp revision deactivate \
  --name finvibe-backend \
  --resource-group rg-finvibe \
  --revision <new-revision>

# 2. Activate old revision
az containerapp revision activate \
  --name finvibe-backend \
  --resource-group rg-finvibe \
  --revision <old-revision>

# 3. Verify application is working
curl https://<app-url>/health
```

---

## Success Criteria

### Technical Metrics
- ✅ Data persists across container restarts
- ✅ Application connects successfully
- ✅ All database operations function correctly
- ✅ Backups are running and restorable
- ✅ Performance meets SLA requirements

### Business Metrics
- ✅ Cost within budget ($16-20/month for dev)
- ✅ Zero data loss incidents
- ✅ 99.9% uptime SLA met
- ✅ Backup/restore tested and documented

---

## Next Steps

1. **Review and Approve Plan**: Get stakeholder sign-off
2. **Set Up Terraform**: Create infrastructure code
3. **Deploy to Dev**: Test in development environment
4. **Validate**: Run full test suite
5. **Deploy to Prod**: Gradual rollout with monitoring
6. **Document**: Update operational runbooks

---

## Appendix A: Terraform Variables

```hcl
variable "postgres_tier" {
  description = "PostgreSQL SKU tier"
  type        = string
  default     = "B_Standard_B1ms"  # Cheapest option

  validation {
    condition = contains([
      "B_Standard_B1ms",
      "B_Standard_B2s",
      "GP_Standard_D2ds_v5",
      "MO_Standard_E2ds_v5"
    ], var.postgres_tier)
    error_message = "Must be a valid PostgreSQL SKU."
  }
}

variable "postgres_storage_gb" {
  description = "Storage size in GB"
  type        = number
  default     = 32

  validation {
    condition     = var.postgres_storage_gb >= 32 && var.postgres_storage_gb <= 16384
    error_message = "Storage must be between 32 GB and 16 TB."
  }
}

variable "postgres_backup_retention_days" {
  description = "Backup retention in days"
  type        = number
  default     = 7

  validation {
    condition     = var.postgres_backup_retention_days >= 7 && var.postgres_backup_retention_days <= 35
    error_message = "Retention must be between 7 and 35 days."
  }
}

variable "postgres_high_availability_enabled" {
  description = "Enable high availability"
  type        = bool
  default     = false  # Disabled for cost savings in dev/staging
}
```

---

## Appendix B: Cost Calculator

### Monthly Cost Formula
```
Total Cost = Compute + Storage + Backup + IOPS

Compute = vCore_hourly_rate × 730 hours
Storage = Storage_GB × $0.115
Backup  = (Backup_GB - Free_Backup) × $0.095
IOPS    = Additional_IOPS × $0.05

Where:
- Free_Backup = min(Storage_GB, Backup_GB)
- Additional_IOPS = max(0, Required_IOPS - Included_IOPS)
```

### Example Calculations

**Development Environment (B1ms, 32GB)**
```
Compute = $0.017 × 730 = $12.41
Storage = 32 × $0.115 = $3.68
Backup  = 0 (32GB free with 32GB storage)
IOPS    = 0 (400 included)
─────────────────────────────────
Total   = $16.09/month
```

**Production Environment (D2ds_v5, 128GB)**
```
Compute = $0.178 × 730 = $129.94
Storage = 128 × $0.115 = $14.72
Backup  = 0 (128GB free with 128GB storage)
IOPS    = 0 (3,200 included)
─────────────────────────────────
Total   = $144.66/month
```

---

## References

- [Azure PostgreSQL Flexible Server Documentation](https://learn.microsoft.com/azure/postgresql/flexible-server/)
- [Azure PostgreSQL Pricing](https://azure.microsoft.com/pricing/details/postgresql/flexible-server/)
- [Azure Verified Modules - PostgreSQL](https://registry.terraform.io/modules/Azure/avm-res-dbforpostgresql-flexibleserver/azurerm/latest)
- [PostgreSQL Best Practices on Azure](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-best-practices)

---

**Document Version**: 1.0
**Last Updated**: 2026-04-08
**Author**: Claude (AI Assistant)
**Status**: Ready for Review
