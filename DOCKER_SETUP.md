# Docker Setup and Verification Guide

This guide provides comprehensive instructions for setting up, running, and verifying the FinVibe application using Docker.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup Instructions](#detailed-setup-instructions)
4. [Database Initialization](#database-initialization)
5. [Verification Steps](#verification-steps)
6. [Common Operations](#common-operations)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker**: Version 20.10 or higher
  - [Install Docker on Linux](https://docs.docker.com/engine/install/)
  - [Install Docker Desktop on Mac](https://docs.docker.com/desktop/install/mac-install/)
  - [Install Docker Desktop on Windows](https://docs.docker.com/desktop/install/windows-install/)

- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop)

Verify installation:
```bash
docker --version
docker-compose --version
```

---

## Quick Start

For a rapid setup with default settings:

```bash
# 1. Clone the repository (if not already done)
git clone <repository-url>
cd finvibe

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Initialize the database
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed

# 5. Access the application
# Frontend: http://localhost
# Backend API: http://localhost:3000
# PostgreSQL: localhost:5432
```

---

## Detailed Setup Instructions

### Step 1: Environment Configuration

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** (optional, defaults are provided):
   ```env
   # Application Environment
   NODE_ENV=production

   # Service Ports
   BACKEND_PORT=3000
   FRONTEND_PORT=80
   DB_PORT=5432

   # Database Configuration
   DB_TYPE=postgres
   DB_NAME=finvibe
   DB_USER=finvibe_user
   DB_PASSWORD=change_this_in_production

   # CORS Configuration
   CORS_ORIGIN=http://localhost
   ```

3. **Security Note:** For production, **always change the default password**:
   ```bash
   # Generate a strong password
   openssl rand -base64 32
   ```

### Step 2: Build and Start Services

Build and start all containers:
```bash
docker-compose up -d
```

This command will:
- Pull the PostgreSQL 16 Alpine image
- Build the backend API container
- Build the frontend container
- Create a Docker network for service communication
- Create a persistent volume for PostgreSQL data
- Start all services with health checks

**Expected output:**
```
[+] Running 4/4
 ✔ Network finvibe-network       Created
 ✔ Volume finvibe_postgres_data  Created
 ✔ Container finvibe-postgres    Started
 ✔ Container finvibe-backend     Started
 ✔ Container finvibe-frontend    Started
```

### Step 3: Verify Services are Running

Check that all services are healthy:
```bash
docker-compose ps
```

**Expected output:**
```
NAME                 IMAGE                  STATUS                    PORTS
finvibe-backend      finvibe-backend        Up (healthy)              0.0.0.0:3000->3000/tcp
finvibe-frontend     finvibe-frontend       Up (healthy)              0.0.0.0:80->80/tcp
finvibe-postgres     postgres:16-alpine     Up (healthy)              0.0.0.0:5432->5432/tcp
```

All services should show `Up (healthy)` status. If they show `Up (health: starting)`, wait a few seconds and check again.

---

## Database Initialization

### Step 4: Run Database Migrations

Create the database schema:
```bash
docker-compose exec backend npm run migrate
```

**Expected output:**
```
🔄 Running database migrations...
✅ Migration 001_create_accounts_table.sql completed
✅ Migration 002_create_categories_table.sql completed
✅ Migration 003_create_budgets_table.sql completed
✅ Migration 004_create_transactions_table.sql completed
✅ All migrations completed successfully!
```

### Step 5: Seed the Database

Populate with default categories:
```bash
docker-compose exec backend npm run seed
```

**Expected output:**
```
🌱 Seeding database...
📊 Seeded 15 default categories
📊 Found 0 existing categories
✅ Database seeded successfully!
```

---

## Verification Steps

### 1. Verify Backend API

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX..."
}
```

Test the categories endpoint:
```bash
curl http://localhost:3000/api/categories
```

**Expected response:**
```json
[
  {
    "id": 1,
    "name": "Salary",
    "type": "income",
    "icon": "💰",
    "color": "#10B981",
    "is_default": 1
  },
  ...
]
```

### 2. Verify Frontend

**Browser Test:**
1. Open your browser and navigate to: `http://localhost`
2. You should see the FinVibe dashboard
3. The application should load without errors

**Check Browser Console:**
- Open Developer Tools (F12)
- Check the Console tab for any errors
- You should see API request logs if logging is enabled

### 3. Verify Database Connectivity

Connect to PostgreSQL directly:
```bash
docker-compose exec postgres psql -U finvibe_user -d finvibe
```

Once connected, run:
```sql
-- List all tables
\dt

-- Count categories
SELECT COUNT(*) FROM categories;

-- Exit psql
\q
```

**Expected output:**
```
           List of relations
 Schema |      Name      | Type  |    Owner
--------+----------------+-------+--------------
 public | accounts       | table | finvibe_user
 public | budgets        | table | finvibe_user
 public | categories     | table | finvibe_user
 public | migrations     | table | finvibe_user
 public | transactions   | table | finvibe_user

 count
-------
    15
```

### 4. Verify Service Communication

Test that the frontend can reach the backend:
```bash
# From your host machine
curl -I http://localhost

# Check if the frontend is serving correctly
curl http://localhost | grep -i "finvibe"
```

### 5. End-to-End Functional Test

Perform a complete workflow test:

1. **Create an Account:**
   ```bash
   curl -X POST http://localhost:3000/api/accounts \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Checking",
       "type": "checking",
       "balance": 1000.00,
       "currency": "USD"
     }'
   ```

2. **Verify Account Creation:**
   ```bash
   curl http://localhost:3000/api/accounts
   ```

3. **Create a Transaction:**
   ```bash
   curl -X POST http://localhost:3000/api/transactions \
     -H "Content-Type: application/json" \
     -d '{
       "account_id": 1,
       "category_id": 1,
       "type": "income",
       "amount": 500.00,
       "description": "Test Income",
       "date": "2025-01-15"
     }'
   ```

4. **Verify Transaction:**
   ```bash
   curl http://localhost:3000/api/transactions
   ```

All commands should return valid JSON responses without errors.

---

## Common Operations

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Specific service:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

**Last N lines:**
```bash
docker-compose logs --tail=50 backend
```

### Restart Services

**All services:**
```bash
docker-compose restart
```

**Specific service:**
```bash
docker-compose restart backend
```

### Stop Services

**Stop without removing containers:**
```bash
docker-compose stop
```

**Stop and remove containers (keeps volumes):**
```bash
docker-compose down
```

**Stop, remove containers and volumes (⚠️ deletes all data):**
```bash
docker-compose down -v
```

### Rebuild Containers

After code changes:
```bash
# Rebuild and restart
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

### Access Container Shell

**Backend:**
```bash
docker-compose exec backend sh
```

**Frontend:**
```bash
docker-compose exec frontend sh
```

**PostgreSQL:**
```bash
docker-compose exec postgres sh
```

### Database Backup

**Create backup:**
```bash
docker-compose exec postgres pg_dump -U finvibe_user finvibe > backup.sql
```

**Restore backup:**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U finvibe_user -d finvibe
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker-compose logs
```

**Common issues:**
1. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :3000
   lsof -i :80

   # Change ports in .env
   BACKEND_PORT=3001
   FRONTEND_PORT=8080
   ```

2. **PostgreSQL initialization failed:**
   ```bash
   # Remove volumes and recreate
   docker-compose down -v
   docker-compose up -d
   ```

3. **Build errors:**
   ```bash
   # Clean build cache
   docker-compose build --no-cache
   ```

### Database Connection Issues

**Verify PostgreSQL is running:**
```bash
docker-compose ps postgres
```

**Check PostgreSQL logs:**
```bash
docker-compose logs postgres
```

**Test connection:**
```bash
docker-compose exec postgres pg_isready -U finvibe_user
```

**Expected output:** `accepting connections`

### Frontend Cannot Connect to Backend

1. **Check CORS configuration** in `.env`:
   ```env
   CORS_ORIGIN=http://localhost
   ```

2. **Verify backend is accessible:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check browser console** for CORS errors

4. **Rebuild frontend** with correct API URL:
   ```bash
   docker-compose up -d --build frontend
   ```

### Slow Performance

1. **Check resource usage:**
   ```bash
   docker stats
   ```

2. **Increase Docker resources:**
   - Docker Desktop → Settings → Resources
   - Increase CPU and Memory allocation

3. **Prune unused resources:**
   ```bash
   docker system prune -a
   ```

### Health Checks Failing

**Check health status:**
```bash
docker-compose ps
```

**Inspect health check logs:**
```bash
docker inspect finvibe-backend | grep -A 10 Health
```

**Common fixes:**
1. Increase `start_period` in docker-compose.yml
2. Check if the service is listening on the correct port
3. Verify health endpoint exists

---

## Production Deployment

### Security Checklist

Before deploying to production:

- [ ] Change default database password
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Use HTTPS (set up reverse proxy with SSL)
- [ ] Enable firewall rules
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Use Docker secrets for sensitive data
- [ ] Limit container resources
- [ ] Set up monitoring and alerting

### Production Environment Variables

Create a production `.env` file:

```env
NODE_ENV=production

# Strong passwords
DB_PASSWORD=<generated-strong-password>

# Production domains
CORS_ORIGIN=https://yourdomain.com

# Ports (default to 80/443 with reverse proxy)
BACKEND_PORT=3000
FRONTEND_PORT=80
DB_PORT=5432
```

### Using a Reverse Proxy (Recommended)

For production, use nginx or Traefik as a reverse proxy:

**Example nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Monitoring

**Set up monitoring:**
```bash
# Add to docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Summary

You now have a fully containerized FinVibe application running with:

- ✅ PostgreSQL database with persistent storage
- ✅ Node.js backend API with health checks
- ✅ React frontend served by nginx
- ✅ Proper service networking and dependencies
- ✅ Database migrations and seed data
- ✅ Production-ready security configurations

### Key URLs

- **Frontend:** http://localhost
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **Database:** localhost:5432

### Next Steps

1. **Customize the application** to your needs
2. **Set up CI/CD** pipeline for automated deployments
3. **Configure monitoring** and alerting
4. **Set up automated backups**
5. **Review security** configurations before production deployment

For questions or issues, refer to the troubleshooting section or check the application logs.

---

**Happy coding with FinVibe! 🚀**
