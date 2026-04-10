# PostgreSQL Migration Guide

This guide explains the changes made to migrate from SQLite to PostgreSQL in Azure Container Apps.

## Summary of Changes

### Infrastructure Changes (Terraform)

1. **New PostgreSQL Container** (`infra/main.tf`)
   - Added a dedicated PostgreSQL 16 Alpine container in Azure Container Apps
   - Configured with 0.5 CPU and 1Gi memory
   - Uses EmptyDir storage for data persistence
   - Internal-only access (not exposed externally)
   - Single replica (min=1, max=1) for data consistency

2. **Backend Configuration Updates** (`infra/main.tf`)
   - Set `DB_TYPE=postgres` environment variable
   - Added PostgreSQL connection variables:
     - `DB_HOST`: Points to PostgreSQL container FQDN
     - `DB_PORT`: 5432
     - `DB_NAME`: Database name
     - `DB_USER`: Database username
     - `DB_PASSWORD`: Database password (from secrets)
   - Added dependency on PostgreSQL container

3. **New Variables** (`infra/variables.tf`)
   - `postgres_db_name`: Database name (default: "finvibe")
   - `postgres_user`: Database username (default: "finvibe_user")
   - `postgres_password`: Database password (sensitive, required)

4. **Updated Outputs** (`infra/outputs.tf`)
   - Added `postgres_fqdn` output for PostgreSQL container FQDN
   - Updated deployment summary to include PostgreSQL connection info

### Application Changes

1. **Removed SQLite Dependency** (`backend/package.json`)
   - SQLite adapter removed; backend is now PostgreSQL-only
   - `pg` (PostgreSQL driver) retained for all environments

2. **CI/CD Updates** (`.github/workflows/azure-deploy-tf.yml`)
   - Added `TF_VAR_postgres_password` environment variable
   - Added `terraform validate` step before `terraform plan`

3. **Configuration Template** (`infra/terraform.tfvars.example`)
   - Added PostgreSQL configuration variables
   - Included example values for database name, user, and password

## Deployment Steps

### Prerequisites

The backend uses PostgreSQL exclusively:
- `backend/src/db/postgres.js` - PostgreSQL adapter
- `backend/src/db/database-factory.js` - PostgreSQL-only factory
- `backend/src/db/migrate-postgres.js` - PostgreSQL migrations

### Step 1: Set GitHub Secret

Add the PostgreSQL password as a GitHub repository secret:

```bash
# Go to: Settings > Secrets and variables > Actions > New repository secret
Name: POSTGRES_PASSWORD
Value: <your-secure-password>
```

### Step 2: Deploy Infrastructure

The next push to `main` branch with infrastructure changes will trigger the deployment:

```bash
git push origin main
```

Or manually trigger the workflow:
```bash
gh workflow run "Deploy to Azure with Terraform"
```

### Step 3: Verify Deployment

After deployment completes, verify:

1. **Check Terraform Outputs**:
   ```bash
   cd infra
   terraform output deployment_summary
   ```

2. **Verify PostgreSQL Container**:
   - Go to Azure Portal
   - Navigate to your Container Apps Environment
   - Check that `finvibe-postgres` container is running

3. **Verify Backend Connectivity**:
   - Check backend container logs for successful database connection
   - Look for: "📊 Using PostgreSQL database"

4. **Test API Endpoints**:
   ```bash
   curl https://<backend-url>/health
   ```

### Step 4: Database Migration

The backend will automatically run migrations on startup if the schema version differs:

1. Backend connects to PostgreSQL using environment variables
2. Database factory creates PostgreSQL adapter based on `DB_TYPE=postgres`
3. Migration script (`migrate-postgres.js`) runs on startup
4. Default categories and sample data are seeded

## Architecture Details

### PostgreSQL Container Configuration

- **Image**: `postgres:16-alpine`
- **Resources**: 0.5 CPU, 1Gi memory
- **Storage**: EmptyDir volume at `/var/lib/postgresql/data`
- **Network**: Internal-only ingress on port 5432
- **Environment Variables**:
  - `POSTGRES_DB`: Database name
  - `POSTGRES_USER`: Database username
  - `POSTGRES_PASSWORD`: Database password
  - `PGDATA`: Custom data directory path

### Backend Container Configuration

- **Database Type**: Set via `DB_TYPE=postgres`
- **Connection**: Connects to PostgreSQL container via internal FQDN
- **Host**: `module.postgres_container_app.fqdn` (internal DNS)
- **Port**: 5432

### Database Factory Pattern

The application uses a factory pattern to support multiple database types:

```javascript
// Automatically selects adapter based on DB_TYPE environment variable
const db = DatabaseFactory.createDatabase({ type: process.env.DB_TYPE });
```

## Storage Considerations

### Current Setup (EmptyDir)

- **Pros**:
  - Simple setup, no additional Azure resources needed
  - Works for development and testing
  - Low cost

- **Cons**:
  - **Data is ephemeral**: Lost on container restart
  - Not suitable for production data
  - No backups or redundancy

### Production Recommendations

For production workloads, consider these alternatives:

1. **Azure Database for PostgreSQL Flexible Server**
   - Fully managed service
   - Automatic backups and point-in-time restore
   - High availability options
   - Better for production

2. **Azure Files (SMB)**
   - Persistent storage that survives container restarts
   - Shared across replicas
   - Integrated backups

3. **Azure Container Apps Storage (Preview)**
   - Native persistent storage for Container Apps
   - Azure Files or Azure Blob Storage backend

## Troubleshooting

### Backend Can't Connect to PostgreSQL

1. Check PostgreSQL container is running:
   ```bash
   az containerapp show --name finvibe-postgres --resource-group finvibe-rg
   ```

2. Check backend logs for connection errors:
   ```bash
   az containerapp logs show --name finvibe-backend --resource-group finvibe-rg
   ```

3. Verify environment variables are set correctly:
   ```bash
   az containerapp show --name finvibe-backend --resource-group finvibe-rg --query properties.template.containers[0].env
   ```

### PostgreSQL Container Not Starting

1. Check container logs:
   ```bash
   az containerapp logs show --name finvibe-postgres --resource-group finvibe-rg
   ```

2. Verify password is set correctly:
   - Check GitHub secret `POSTGRES_PASSWORD` is defined
   - Ensure it meets PostgreSQL password requirements

3. Check resource allocation:
   - Ensure Container Apps Environment has sufficient capacity

### Data Loss After Restart

This is expected with EmptyDir storage. See "Storage Considerations" above for production-ready solutions.

## Next Steps

1. **Set up persistent storage** for production use
2. **Configure automated backups**
3. **Set up monitoring** for PostgreSQL metrics
4. **Implement database connection pooling** (already configured in postgres.js)
5. **Configure read replicas** for high availability (if using Azure Database for PostgreSQL)

## References

- [Azure Container Apps Documentation](https://learn.microsoft.com/en-us/azure/container-apps/)
- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/)
