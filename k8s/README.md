# Deploying FinVibe to Talos on Proxmox

This guide walks through deploying the full stack (PostgreSQL + backend + frontend) to a Talos Kubernetes cluster running on Proxmox.

## Directory Structure

```
k8s/
├── namespace.yaml
├── secrets/
│   ├── db-secret.yaml.example    # Copy → db-secret.yaml, fill in values
│   └── app-secret.yaml.example   # Copy → app-secret.yaml, fill in values
├── postgres/
│   ├── statefulset.yaml
│   └── service.yaml
├── backend/
│   ├── configmap.yaml
│   ├── pvc.yaml
│   ├── deployment.yaml
│   └── service.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
└── ingress.yaml
```

---

## Step 1 — Install Talos on Proxmox

1. Download the Talos ISO from https://github.com/siderolabs/talos/releases  
   Use the `metal-amd64.iso` image.

2. Create Proxmox VMs (minimum recommended):
   - **Control plane**: 2 vCPU, 4 GB RAM, 50 GB disk (1 or 3 nodes for HA)
   - **Workers**: 2 vCPU, 4 GB RAM, 80 GB disk (1+ nodes)
   - Attach the Talos ISO as a CD-ROM and boot from it.

3. Generate Talos config (from your workstation with `talosctl` installed):
   ```bash
   # Replace 192.168.1.100 with the IP you plan to assign to your control plane VIP
   talosctl gen config finvibe-cluster https://192.168.1.100:6443 \
     --output-dir ./talos-config

   # Apply config to control plane node (replace IP with the VM's actual IP)
   talosctl apply-config --insecure --nodes 192.168.1.101 \
     --file ./talos-config/controlplane.yaml

   # Apply config to each worker node
   talosctl apply-config --insecure --nodes 192.168.1.102 \
     --file ./talos-config/worker.yaml

   # Bootstrap the cluster (run once, on first control plane only)
   talosctl bootstrap --nodes 192.168.1.101 \
     --talosconfig ./talos-config/talosconfig

   # Get kubeconfig
   talosctl kubeconfig --nodes 192.168.1.101 \
     --talosconfig ./talos-config/talosconfig
   ```

4. Verify the cluster is up:
   ```bash
   kubectl get nodes
   ```

---

## Step 2 — Install Cluster Add-ons

### CNI (Flannel — simplest option)
Talos does not include a CNI by default. Install Flannel:
```bash
kubectl apply -f https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

Alternatively, install Cilium for more features:
```bash
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium --namespace kube-system
```

### Storage (local-path-provisioner)
Required for PersistentVolumeClaims used by PostgreSQL and the backend:
```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml
# Set it as the default StorageClass
kubectl patch storageclass local-path -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

### Ingress Controller (nginx)
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/baremetal/deploy.yaml
```

> For Proxmox home labs without a cloud load balancer, the ingress controller will use a NodePort.  
> You can also install **MetalLB** to get a real LoadBalancer IP from your LAN range.

### MetalLB (optional, for LoadBalancer IPs)
```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```
Then configure an IP pool matching a free range on your LAN:
```yaml
# metallb-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: lan-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.220   # adjust to your LAN
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
```

---

## Step 3 — Build and Push Docker Images

Build both images and push them to a container registry the cluster can reach.

### Option A: GitHub Container Registry (GHCR)
```bash
# Log in
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Build and push backend
docker build -t ghcr.io/YOUR_GITHUB_USERNAME/finvibe-backend:latest ./backend
docker push ghcr.io/YOUR_GITHUB_USERNAME/finvibe-backend:latest

# Build and push frontend
docker build -t ghcr.io/YOUR_GITHUB_USERNAME/finvibe-frontend:latest ./frontend
docker push ghcr.io/YOUR_GITHUB_USERNAME/finvibe-frontend:latest
```

### Option B: Local registry in the cluster
```bash
# Deploy a local registry
kubectl create namespace registry
kubectl run registry --image=registry:2 --port=5000 -n registry
kubectl expose pod registry --port=5000 --type=NodePort -n registry

# Then tag images for the node IP:nodeport
```

After pushing, update the `image:` fields in:
- [k8s/backend/deployment.yaml](backend/deployment.yaml)
- [k8s/frontend/deployment.yaml](frontend/deployment.yaml)

---

## Step 4 — Create Secrets

**Never commit real secrets to source control.**

```bash
# Copy the templates
cp k8s/secrets/db-secret.yaml.example k8s/secrets/db-secret.yaml
cp k8s/secrets/app-secret.yaml.example k8s/secrets/app-secret.yaml

# Edit both files — fill in your actual passwords
# Generate a strong JWT secret:
openssl rand -hex 64
```

Edit [k8s/secrets/db-secret.yaml](secrets/db-secret.yaml) and [k8s/secrets/app-secret.yaml](secrets/app-secret.yaml) with real values.

---

## Step 5 — Update Configuration

Edit [k8s/backend/configmap.yaml](backend/configmap.yaml):
```yaml
CORS_ORIGIN: "https://your-actual-domain.com"   # or http://192.168.1.x for LAN-only
```

Edit [k8s/ingress.yaml](ingress.yaml):
```yaml
- host: your-actual-domain.com    # or remove for IP-based access
```

---

## Step 6 — Deploy

Apply everything in order:

```bash
# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. Secrets (these files are gitignored — apply from local copies)
kubectl apply -f k8s/secrets/db-secret.yaml
kubectl apply -f k8s/secrets/app-secret.yaml

# 3. PostgreSQL
kubectl apply -f k8s/postgres/

# 4. Backend
kubectl apply -f k8s/backend/

# 5. Frontend
kubectl apply -f k8s/frontend/

# 6. Ingress
kubectl apply -f k8s/ingress.yaml
```

Wait for all pods to reach `Running`:
```bash
kubectl get pods -n finvibe -w
```

---

## Step 7 — Run Database Migrations

Once the backend pod is running, run the migrations:

```bash
BACKEND_POD=$(kubectl get pod -n finvibe -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n finvibe $BACKEND_POD -- npm run db:migrate
kubectl exec -n finvibe $BACKEND_POD -- npm run db:seed   # optional: seed initial data
```

---

## Step 8 — Access the Application

### With MetalLB / LoadBalancer
```bash
kubectl get svc -n ingress-nginx
# Use the EXTERNAL-IP shown
```

### With NodePort (bare metal without MetalLB)
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Use http://<any-node-ip>:<node-port>
```

### DNS
Point your domain's A record to the LoadBalancer IP or node IP.  
For LAN-only access, add an entry to your router's DNS or `/etc/hosts`.

---

## Updating the App

```bash
# Rebuild and push new image
docker build -t ghcr.io/YOUR_USERNAME/finvibe-backend:v2 ./backend
docker push ghcr.io/YOUR_USERNAME/finvibe-backend:v2

# Roll out update (zero-downtime rolling update)
kubectl set image deployment/backend backend=ghcr.io/YOUR_USERNAME/finvibe-backend:v2 -n finvibe
kubectl rollout status deployment/backend -n finvibe
```

---

## Useful Commands

```bash
# View all resources
kubectl get all -n finvibe

# View logs
kubectl logs -n finvibe -l app=backend --tail=100
kubectl logs -n finvibe -l app=frontend --tail=100

# Connect to database
kubectl exec -it -n finvibe postgres-0 -- psql -U finvibe_user -d finvibe

# Restart a deployment
kubectl rollout restart deployment/backend -n finvibe

# Check ingress
kubectl describe ingress finvibe-ingress -n finvibe
```

---

## Security Notes

- Add `k8s/secrets/*.yaml` to `.gitignore` to prevent accidental secret commits.
- Consider [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or [External Secrets Operator](https://external-secrets.io/) for production secret management.
- Enable TLS via cert-manager + Let's Encrypt by uncommenting the `tls` block in `ingress.yaml`.
