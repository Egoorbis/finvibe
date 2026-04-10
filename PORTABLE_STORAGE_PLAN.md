# FinVibe Portable Storage Plan
## PostgreSQL Container with Persistent Volumes

### Executive Summary
This plan outlines a **portable, cloud-agnostic approach** to permanent storage using PostgreSQL in a container with Persistent Volume Claims (PVCs). This solution can be deployed on:
- ✅ **Azure Container Apps** with Azure Files/Disks
- ✅ **Kubernetes** (AKS, GKE, EKS, K3s on Proxmox)
- ✅ **Docker Compose** with named volumes
- ✅ **Any container platform** supporting volume mounting

---

## Architecture Overview

### Current Setup
- **PostgreSQL**: Running in Container App with EmptyDir (ephemeral)
- **Problem**: Data lost on restart
- **Location**: Azure Container Apps Environment

### New Portable Architecture
```
┌─────────────────────────────────────────────────────┐
│  Frontend Container                                  │
│  (React/Vite)                                       │
└─────────────────────────────────────────────────────┘
                      │
                      ↓ HTTP/API
┌─────────────────────────────────────────────────────┐
│  Backend Container                                   │
│  (Node.js/Express)                                  │
└─────────────────────────────────────────────────────┘
                      │
                      ↓ TCP:5432
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Container                                │
│  (postgres:16-alpine)                               │
│  ┌───────────────────────────────────────────────┐ │
│  │  Volume Mount: /var/lib/postgresql/data       │ │
│  │  ↓                                             │ │
│  │  Persistent Volume Claim (PVC)                │ │
│  │  - Azure Files (Azure Container Apps)         │ │
│  │  - Azure Disk (AKS)                           │ │
│  │  - Local Storage (Proxmox)                    │ │
│  │  - NFS/Ceph (Any K8s)                        │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Solution Comparison Matrix

| Aspect | Azure Managed PostgreSQL | PostgreSQL Container + PVC |
|--------|-------------------------|----------------------------|
| **Portability** | ❌ Azure-only | ✅ Works anywhere |
| **Cost (dev)** | $16/month | $5-10/month (storage only) |
| **Migration** | ❌ Vendor lock-in | ✅ Easy migration |
| **Backup** | ✅ Automatic | ⚠️ Manual/scripted |
| **High Availability** | ✅ Built-in | ⚠️ Requires setup |
| **Scaling** | ✅ Automatic | ⚠️ Manual |
| **Maintenance** | ✅ Microsoft manages | ⚠️ You manage |
| **Control** | ⚠️ Limited | ✅ Full control |
| **Version Updates** | ⚠️ Microsoft schedule | ✅ Your schedule |

**Recommendation**: Use **PostgreSQL Container + PVC** for maximum portability and flexibility.

---

## Implementation Options

### Option 1: Azure Container Apps with Azure Files (Recommended for Azure)

Azure Container Apps supports persistent storage through Azure Files SMB shares.

#### Pricing
- **Storage**: Azure Files Standard (LRS)
  - First 100 GB: $0.06/GB/month = **$6/month** for 100GB
  - First 10 GB: **$0.60/month**
  - First 32 GB: **$1.92/month** ✅ **CHEAPEST**
- **Transactions**: Minimal for database (~$0.10/month)
- **Total**: ~**$2-7/month** depending on size

#### Terraform Configuration

```hcl
# Storage Account for PostgreSQL data
resource "azurerm_storage_account" "postgres" {
  name                     = "stfinvibepg${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  # Security settings
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"

  tags = var.tags
}

# File Share for PostgreSQL data
resource "azurerm_storage_share" "postgres_data" {
  name                 = "postgres-data"
  storage_account_name = azurerm_storage_account.postgres.name
  quota                = 32  # GB - start small, increase as needed

  # Enable backup (optional but recommended)
  metadata = {
    environment = var.environment
    purpose     = "postgresql-data"
  }
}

# PostgreSQL Container App with Persistent Volume
module "postgres_container_app" {
  source  = "Azure/avm-res-app-containerapp/azurerm"
  version = "0.8.0"

  name                                  = "finvibe-postgres"
  resource_group_name                   = azurerm_resource_group.main.name
  container_app_environment_resource_id = module.container_apps_environment.resource_id

  revision_mode = "Single"

  template = {
    containers = [{
      name   = "postgres"
      image  = "postgres:16-alpine"
      cpu    = 0.5
      memory = "1Gi"

      env = [
        {
          name  = "POSTGRES_DB"
          value = var.postgres_db_name
        },
        {
          name  = "POSTGRES_USER"
          value = var.postgres_user
        },
        {
          name        = "POSTGRES_PASSWORD"
          secret_name = "postgres-password"
        },
        {
          name  = "PGDATA"
          value = "/var/lib/postgresql/data"
        }
      ]

      volume_mounts = [{
        name       = "postgres-data"
        mount_path = "/var/lib/postgresql/data"
      }]
    }]

    min_replicas = 1
    max_replicas = 1

    # Azure Files volume
    volumes = [{
      name         = "postgres-data"
      storage_type = "AzureFile"
      storage_name = "postgres-storage"
    }]
  }

  # Internal-only ingress
  ingress = {
    external_enabled = false
    target_port      = 5432
    transport        = "tcp"
    traffic_weight = [{
      latest_revision = true
      percentage      = 100
    }]
  }

  # Secrets
  secrets = [
    {
      name  = "postgres-password"
      value = var.postgres_password
    }
  ]

  tags = var.tags

  depends_on = [
    module.container_apps_environment,
    azurerm_storage_share.postgres_data
  ]
}

# Storage configuration for Container Apps Environment
resource "azurerm_container_app_environment_storage" "postgres" {
  name                         = "postgres-storage"
  container_app_environment_id = module.container_apps_environment.resource_id
  account_name                 = azurerm_storage_account.postgres.name
  share_name                   = azurerm_storage_share.postgres_data.name
  access_key                   = azurerm_storage_account.postgres.primary_access_key
  access_mode                  = "ReadWrite"
}
```

---

### Option 2: Kubernetes (AKS, K3s on Proxmox, etc.)

For Kubernetes deployments (including AKS, GKE, EKS, or K3s on Proxmox).

#### Kubernetes Manifests

**1. Persistent Volume Claim**
```yaml
# k8s/postgres-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: finvibe
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 32Gi
  # Storage class depends on environment:
  # - Azure: azurefile, managed-csi, managed-premium
  # - Proxmox: local-path, nfs-client, ceph-rbd
  # - GKE: standard, standard-rwo
  # - EKS: gp3, gp2
  storageClassName: default  # Change based on environment
```

**2. ConfigMap for PostgreSQL Configuration**
```yaml
# k8s/postgres-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: finvibe
data:
  POSTGRES_DB: finvibe
  POSTGRES_USER: finvibe
  # Note: POSTGRES_PASSWORD should be in Secret, not ConfigMap
```

**3. Secret for PostgreSQL Password**
```yaml
# k8s/postgres-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: finvibe
type: Opaque
stringData:
  POSTGRES_PASSWORD: changeme-use-strong-password-here
```

**4. PostgreSQL Deployment**
```yaml
# k8s/postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: finvibe
  labels:
    app: postgres
spec:
  replicas: 1
  strategy:
    type: Recreate  # Important: prevents multiple pods accessing same PVC
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          valueFrom:
            configMapKeyRef:
              name: postgres-config
              key: POSTGRES_DB
        - name: POSTGRES_USER
          valueFrom:
            configMapKeyRef:
              name: postgres-config
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U finvibe
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - pg_isready -U finvibe
          initialDelaySeconds: 5
          periodSeconds: 5
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
```

**5. PostgreSQL Service**
```yaml
# k8s/postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: finvibe
  labels:
    app: postgres
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgres
  selector:
    app: postgres
```

---

### Option 3: Docker Compose (Local Development / Proxmox)

For local development or simple Proxmox deployments using Docker Compose.

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: finvibe-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: finvibe
      POSTGRES_USER: finvibe
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      PGDATA: /var/lib/postgresql/data
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"  # Only expose for local dev, remove for production
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U finvibe"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - finvibe-network

  backend:
    image: finvibe-backend:latest
    container_name: finvibe-backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_TYPE: postgres
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: finvibe
      DB_USER: finvibe
      DB_PASSWORD: ${POSTGRES_PASSWORD:-changeme}
      JWT_SECRET: ${JWT_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      RESEND_FROM_EMAIL: ${RESEND_FROM_EMAIL}
    ports:
      - "3000:3000"
    networks:
      - finvibe-network

  frontend:
    image: finvibe-frontend:latest
    container_name: finvibe-frontend
    restart: unless-stopped
    depends_on:
      - backend
    environment:
      VITE_API_URL: http://localhost:3000/api
    ports:
      - "80:80"
    networks:
      - finvibe-network

volumes:
  postgres-data:
    driver: local
    # For NFS on Proxmox:
    # driver_opts:
    #   type: nfs
    #   o: addr=192.168.1.100,rw
    #   device: ":/mnt/nfs/finvibe-postgres"

networks:
  finvibe-network:
    driver: bridge
```

**Environment file (.env)**
```bash
# .env
POSTGRES_PASSWORD=your-secure-password-here
JWT_SECRET=your-jwt-secret-here
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Storage Backend Options by Platform

### Azure Container Apps
```hcl
# Storage options:
1. Azure Files (SMB) - Best for portability
   - Supports ReadWriteMany
   - Standard: $0.06/GB/month
   - Premium: $0.15/GB/month

2. Azure Disk (managed-premium)
   - Better performance
   - ReadWriteOnce only
   - $0.12/GB/month (Premium SSD)
```

### Kubernetes on Azure (AKS)
```yaml
# StorageClass options:
- azurefile (Azure Files) - Portable
- azurefile-csi (Azure Files CSI) - Modern
- managed-csi (Azure Disk) - High performance
- managed-premium (Premium SSD) - Best performance
```

### Proxmox with K3s
```yaml
# Storage options:
1. local-path (default) - Uses host directory
2. nfs-client - Network File System
3. ceph-rbd - Ceph block storage
4. longhorn - Cloud-native distributed storage
5. openebs - Container-native storage
```

### AWS (EKS)
```yaml
# StorageClass options:
- gp3 (General Purpose SSD v3) - Best value
- gp2 (General Purpose SSD v2) - Legacy
- io2 (Provisioned IOPS) - High performance
- efs (Elastic File System) - ReadWriteMany
```

### GCP (GKE)
```yaml
# StorageClass options:
- standard (pd-standard) - HDD
- standard-rwo (pd-balanced) - Balanced SSD
- premium-rwo (pd-ssd) - High performance SSD
- filestore - NFS-based ReadWriteMany
```

---

## Migration Strategy

### Step 1: Deploy PostgreSQL with Persistent Storage

**Azure Container Apps**
```bash
# 1. Create storage account and file share
terraform init
terraform plan -target=azurerm_storage_account.postgres
terraform apply -target=azurerm_storage_account.postgres

# 2. Deploy PostgreSQL container with volume
terraform plan -target=module.postgres_container_app
terraform apply -target=module.postgres_container_app
```

**Kubernetes**
```bash
# 1. Create namespace
kubectl create namespace finvibe

# 2. Apply configurations
kubectl apply -f k8s/postgres-config.yaml
kubectl apply -f k8s/postgres-secret.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/postgres-service.yaml

# 3. Verify PVC is bound
kubectl get pvc -n finvibe
kubectl get pods -n finvibe
```

**Docker Compose**
```bash
# 1. Create .env file with secrets
cp .env.example .env
vim .env  # Edit with your values

# 2. Start services
docker-compose up -d postgres

# 3. Verify
docker-compose ps
docker-compose logs postgres
```

### Step 2: Initialize Database

```bash
# Wait for PostgreSQL to be ready
kubectl exec -it postgres-xxx -n finvibe -- pg_isready -U finvibe

# Run migrations
kubectl exec -it postgres-xxx -n finvibe -- psql -U finvibe -d finvibe -c "
  -- Your schema here
"

# Or from your local machine
export DB_HOST=localhost  # Use port-forward or service IP
export DB_TYPE=postgres
export DB_NAME=finvibe
export DB_USER=finvibe
export DB_PASSWORD=your-password
npm run migrate  # From backend directory
```

### Step 3: Update Backend Configuration

The backend is already configured to use PostgreSQL. Just update environment variables:

```bash
# Azure Container Apps - already configured in Terraform
# Just update the DB_HOST to point to new postgres service

# Kubernetes - update backend deployment
kubectl set env deployment/backend \
  -n finvibe \
  DB_HOST=postgres.finvibe.svc.cluster.local

# Docker Compose - already configured
# Just ensure DB_HOST=postgres
```

### Step 4: Test and Verify

```bash
# Test database connection
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n finvibe -- \
  psql -h postgres -U finvibe -d finvibe -c "SELECT version();"

# Test application
curl http://<your-app-url>/health

# Verify data persists
kubectl delete pod postgres-xxx -n finvibe
# Wait for new pod to start
kubectl get pods -n finvibe
# Verify data still exists
```

---

## Backup and Disaster Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-postgres.sh

# Configuration
NAMESPACE="finvibe"
POD_NAME=$(kubectl get pod -n $NAMESPACE -l app=postgres -o jsonpath='{.items[0].metadata.name}')
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="finvibe_backup_${DATE}.sql.gz"

# Create backup
echo "Creating backup: $BACKUP_FILE"
kubectl exec -n $NAMESPACE $POD_NAME -- \
  pg_dump -U finvibe finvibe | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "finvibe_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_FILE}"
```

### Kubernetes CronJob for Automated Backups

```yaml
# k8s/postgres-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: finvibe
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            env:
            - name: PGHOST
              value: postgres
            - name: PGUSER
              value: finvibe
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
            command:
            - /bin/sh
            - -c
            - |
              BACKUP_FILE="/backups/finvibe_$(date +%Y%m%d_%H%M%S).sql.gz"
              pg_dump finvibe | gzip > $BACKUP_FILE
              echo "Backup created: $BACKUP_FILE"
              # Cleanup old backups (keep 7 days)
              find /backups -name "finvibe_*.sql.gz" -mtime +7 -delete
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: postgres-backup-pvc
```

### Restore from Backup

```bash
# Kubernetes
kubectl exec -it postgres-xxx -n finvibe -- \
  psql -U finvibe -d finvibe < /backups/finvibe_backup_20260408.sql

# Docker Compose
docker exec -i finvibe-postgres \
  psql -U finvibe -d finvibe < backups/finvibe_backup_20260408.sql

# From local machine
gunzip -c finvibe_backup_20260408.sql.gz | \
  psql -h localhost -U finvibe -d finvibe
```

---

## Platform-Specific Considerations

### Azure Container Apps

**Pros:**
- ✅ Simple Terraform configuration
- ✅ Integrated with Azure services
- ✅ Automatic HTTPS/SSL
- ✅ Built-in scaling

**Cons:**
- ⚠️ Azure Files performance (use Premium tier for production)
- ⚠️ Limited to Azure

**Cost:**
- Storage: $2-7/month (32-100GB)
- Compute: Included in Container Apps pricing
- **Total: $2-15/month**

### Proxmox with K3s

**Pros:**
- ✅ Full control
- ✅ No cloud costs
- ✅ High performance with local storage
- ✅ Easy migration to other K8s

**Cons:**
- ⚠️ You manage everything
- ⚠️ Need to set up backups
- ⚠️ No automatic scaling

**Cost:**
- **$0/month** (just hardware and electricity)

### Kubernetes (Any Cloud)

**Pros:**
- ✅ Cloud-agnostic
- ✅ Easy migration
- ✅ Standardized deployment
- ✅ Rich ecosystem

**Cons:**
- ⚠️ More complex than Docker Compose
- ⚠️ Storage costs vary by provider

**Cost:**
- Storage: $3-10/month depending on provider
- Compute: Cluster costs (varies)

---

## Migration Between Platforms

### Export Data
```bash
# Create dump
pg_dump -h <current-host> -U finvibe -d finvibe \
  -F c -f finvibe_export.dump

# Or SQL format
pg_dump -h <current-host> -U finvibe -d finvibe \
  -f finvibe_export.sql
```

### Import to New Platform
```bash
# Restore custom format
pg_restore -h <new-host> -U finvibe -d finvibe \
  -c finvibe_export.dump

# Or SQL format
psql -h <new-host> -U finvibe -d finvibe \
  -f finvibe_export.sql
```

### Copy PVC Between Clusters

```bash
# 1. Create backup from source PVC
kubectl exec -n finvibe postgres-xxx -- \
  tar czf - /var/lib/postgresql/data > postgres-data-backup.tar.gz

# 2. Restore to new PVC in target cluster
kubectl exec -n finvibe postgres-xxx -- \
  tar xzf - -C / < postgres-data-backup.tar.gz
```

---

## Monitoring and Maintenance

### Health Checks

```yaml
# Already included in deployment, but here's the detail:
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - pg_isready -U finvibe
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - pg_isready -U finvibe
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Metrics to Monitor

1. **Storage Usage**
   ```bash
   kubectl exec -n finvibe postgres-xxx -- \
     df -h /var/lib/postgresql/data
   ```

2. **Database Size**
   ```sql
   SELECT pg_size_pretty(pg_database_size('finvibe'));
   ```

3. **Connection Count**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **Slow Queries**
   ```sql
   SELECT * FROM pg_stat_statements
   ORDER BY total_time DESC LIMIT 10;
   ```

---

## Cost Comparison Summary

### Development/Staging

| Platform | Storage Cost | Total Monthly |
|----------|--------------|---------------|
| Azure Container Apps (32GB) | $1.92 | **$2-5** |
| AKS (Azure Disk 32GB) | $3.84 | **$5-10** |
| GKE (pd-balanced 32GB) | $3.84 | **$5-10** |
| EKS (gp3 32GB) | $2.56 | **$5-10** |
| Proxmox (local storage) | $0 | **$0** ✅ |

### Production

| Platform | Storage Cost | HA Setup | Total Monthly |
|----------|--------------|----------|---------------|
| Azure Managed PostgreSQL | $16+ | Included | **$16-50** |
| AKS + StatefulSet | $10 | DIY | **$20-40** |
| Proxmox + K3s | $0 | DIY | **$0** ✅ |

---

## Recommendation Summary

### For Maximum Portability (✅ **RECOMMENDED**)

**Use PostgreSQL Container + PVC approach:**

1. **Development**: Docker Compose on local machine
2. **Staging**: Azure Container Apps with Azure Files
3. **Production**: Either:
   - Kubernetes (AKS/GKE/EKS) for cloud
   - K3s on Proxmox for on-premises
   - Hybrid: Both!

### Migration Path

```
Phase 1: Docker Compose (Local Dev)
    ↓ Deploy to cloud
Phase 2: Azure Container Apps (Testing)
    ↓ Evaluate performance
Phase 3: Decision Point:
    → Stay on Azure Container Apps (simple, managed)
    → Move to Kubernetes (more control, portable)
    → Move to Proxmox (full control, no cloud costs)
```

### Implementation Priority

1. **Week 1**: Set up Docker Compose locally
2. **Week 2**: Deploy to Azure Container Apps with Azure Files
3. **Week 3**: Test data persistence and backups
4. **Week 4**: Prepare Kubernetes manifests for future migration

---

## Files to Create

### 1. Terraform Updates
- `infra/storage.tf` - Storage account and file share
- `infra/postgres-persistent.tf` - Updated PostgreSQL with volume
- `infra/variables.tf` - Add storage-related variables

### 2. Kubernetes Manifests
- `k8s/namespace.yaml`
- `k8s/postgres-config.yaml`
- `k8s/postgres-secret.yaml`
- `k8s/postgres-pvc.yaml`
- `k8s/postgres-deployment.yaml`
- `k8s/postgres-service.yaml`
- `k8s/postgres-backup-cronjob.yaml`

### 3. Docker Compose
- `docker-compose.yml` - Full stack with persistent volumes
- `.env.example` - Template for environment variables

### 4. Scripts
- `scripts/backup-postgres.sh` - Backup automation
- `scripts/restore-postgres.sh` - Restore automation
- `scripts/migrate-data.sh` - Data migration helper

---

## Next Steps

1. **Choose your deployment target** (Azure Container Apps, K8s, Docker Compose)
2. **Review and approve** this plan
3. **Start with Docker Compose** for local development
4. **Deploy to cloud** when ready
5. **Test migration** between platforms to verify portability

---

**Document Version**: 1.0
**Last Updated**: 2026-04-08
**Author**: Claude (AI Assistant)
**Status**: Ready for Review
**Recommended Approach**: PostgreSQL Container + PVC for maximum portability
