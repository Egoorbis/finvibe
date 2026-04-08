# Kubernetes Manifests for FinVibe

This directory contains Kubernetes manifests for deploying FinVibe with persistent storage.

## Quick Start

### 1. Create Namespace
```bash
kubectl apply -f namespace.yaml
```

### 2. Configure PostgreSQL
```bash
# Update postgres-secret.yaml with a strong password
# Generate with: openssl rand -base64 32

kubectl apply -f postgres-config.yaml
kubectl apply -f postgres-secret.yaml
```

### 3. Create Persistent Storage
```bash
# Update postgres-pvc.yaml with your storageClassName
# Options:
# - Azure AKS: azurefile, managed-csi, managed-premium
# - Proxmox: local-path, nfs-client, ceph-rbd, longhorn
# - GKE: standard, standard-rwo, premium-rwo
# - EKS: gp3, gp2

kubectl apply -f postgres-pvc.yaml
```

### 4. Deploy PostgreSQL
```bash
kubectl apply -f postgres-deployment.yaml
kubectl apply -f postgres-service.yaml
```

### 5. Verify Deployment
```bash
# Check PVC status
kubectl get pvc -n finvibe

# Check pod status
kubectl get pods -n finvibe

# Check logs
kubectl logs -n finvibe -l app=postgres

# Test connection
kubectl exec -it -n finvibe $(kubectl get pod -n finvibe -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U finvibe -d finvibe -c "SELECT version();"
```

## Storage Classes by Platform

### Azure AKS
```yaml
storageClassName: azurefile       # Azure Files (SMB)
storageClassName: managed-csi     # Azure Disk (default)
storageClassName: managed-premium # Premium SSD
```

### Proxmox with K3s
```yaml
storageClassName: local-path   # Local host directory (default)
storageClassName: nfs-client   # NFS storage
storageClassName: ceph-rbd     # Ceph block storage
storageClassName: longhorn     # Longhorn distributed storage
```

### Google GKE
```yaml
storageClassName: standard     # HDD (default)
storageClassName: standard-rwo # Balanced SSD
storageClassName: premium-rwo  # High-performance SSD
```

### AWS EKS
```yaml
storageClassName: gp3  # General Purpose SSD v3 (recommended)
storageClassName: gp2  # General Purpose SSD v2
storageClassName: io2  # Provisioned IOPS
```

## Backup Strategy

### Manual Backup
```bash
# Create backup
kubectl exec -n finvibe $(kubectl get pod -n finvibe -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- \
  pg_dump -U finvibe finvibe | gzip > finvibe_backup_$(date +%Y%m%d).sql.gz

# Restore backup
gunzip -c finvibe_backup_20260408.sql.gz | \
  kubectl exec -i -n finvibe $(kubectl get pod -n finvibe -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- \
  psql -U finvibe -d finvibe
```

### Automated Backup (Optional)
Deploy the CronJob in `postgres-backup-cronjob.yaml` for automated daily backups.

## Troubleshooting

### PVC Not Binding
```bash
# Check PVC status
kubectl describe pvc postgres-pvc -n finvibe

# Check available storage classes
kubectl get storageclass

# Check if storage provisioner is running
kubectl get pods -n kube-system | grep -E 'provisioner|csi'
```

### PostgreSQL Pod Not Starting
```bash
# Check pod events
kubectl describe pod -n finvibe -l app=postgres

# Check logs
kubectl logs -n finvibe -l app=postgres

# Common issues:
# - PVC not bound
# - Insufficient resources
# - Wrong credentials in secret
```

### Connection Issues
```bash
# Test from another pod
kubectl run -it --rm debug --image=postgres:16-alpine --restart=Never -n finvibe -- \
  psql -h postgres -U finvibe -d finvibe -c "SELECT version();"

# Check service
kubectl get svc -n finvibe postgres

# Check endpoints
kubectl get endpoints -n finvibe postgres
```

## Migration from Docker Compose

### Export Data
```bash
docker exec finvibe-postgres pg_dump -U finvibe finvibe > finvibe_export.sql
```

### Import to Kubernetes
```bash
kubectl exec -i -n finvibe $(kubectl get pod -n finvibe -l app=postgres -o jsonpath='{.items[0].metadata.name}') -- \
  psql -U finvibe -d finvibe < finvibe_export.sql
```

## Scaling Notes

- PostgreSQL is deployed as a single replica with `Recreate` strategy
- For high availability, consider:
  - StatefulSet with replication
  - PostgreSQL Operator (e.g., Zalando, Crunchy Data)
  - Cloud-managed solutions (Azure Database, Cloud SQL, RDS)
