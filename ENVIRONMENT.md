# Environment Variables Documentation

This document describes all environment variables used in the FinVibe application.

## Quick Start

1. Copy the example environment files:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```

2. Update the values in the `.env` files according to your environment.

## Application Environment Variables

### Root `.env` (Docker Compose)

Used when running the application with Docker Compose.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Application environment (development/production) | `production` | No |
| `BACKEND_PORT` | Port for backend API | `3000` | No |
| `FRONTEND_PORT` | Port for frontend | `80` | No |
| `DB_TYPE` | Database type (`postgres` or `sqlite`) | `postgres` | No |
| `DB_HOST` | PostgreSQL host | `postgres` | No |
| `DB_PORT` | PostgreSQL port | `5432` | No |
| `DB_NAME` | PostgreSQL database name | `finvibe` | No |
| `DB_USER` | PostgreSQL username | `finvibe_user` | No |
| `DB_PASSWORD` | PostgreSQL password | `finvibe_password` | Yes (production) |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost` | No |

### Backend `.env`

Used when running the backend directly (without Docker).

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_TYPE` | Database type (`postgres` or `sqlite`) | `sqlite` | No |
| `DB_HOST` | PostgreSQL host (only for postgres) | `localhost` | If DB_TYPE=postgres |
| `DB_PORT` | PostgreSQL port (only for postgres) | `5432` | If DB_TYPE=postgres |
| `DB_NAME` | PostgreSQL database name (only for postgres) | `finvibe` | If DB_TYPE=postgres |
| `DB_USER` | PostgreSQL username (only for postgres) | `finvibe_user` | If DB_TYPE=postgres |
| `DB_PASSWORD` | PostgreSQL password (only for postgres) | - | If DB_TYPE=postgres |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://localhost:5173` | No |

## Database Configuration

### SQLite (Development/Testing)

SQLite is used by default for development and testing. No additional configuration is required.

```env
DB_TYPE=sqlite
```

The database file will be created at `backend/database.db`.

### PostgreSQL (Production)

For production deployments, PostgreSQL is recommended:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finvibe
DB_USER=finvibe_user
DB_PASSWORD=your_secure_password_here
```

## CORS Configuration

Configure allowed origins for Cross-Origin Resource Sharing (CORS):

### Single Origin
```env
CORS_ORIGIN=http://localhost:5173
```

### Multiple Origins
```env
CORS_ORIGIN=http://localhost:5173,https://app.finvibe.com
```

### Allow All Origins (Development Only)
```env
CORS_ORIGIN=*
```

**⚠️ Warning:** Never use `*` in production as it allows any website to access your API.

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
DB_TYPE=sqlite
CORS_ORIGIN=http://localhost:5173
```

### Production (Docker)
```env
NODE_ENV=production
DB_TYPE=postgres
DB_HOST=postgres
DB_PASSWORD=strong_random_password_here
CORS_ORIGIN=https://yourdomain.com
```

### Production (Manual Deployment)
```env
NODE_ENV=production
DB_TYPE=postgres
DB_HOST=your-postgres-host.com
DB_PORT=5432
DB_NAME=finvibe
DB_USER=finvibe_user
DB_PASSWORD=strong_random_password_here
CORS_ORIGIN=https://yourdomain.com
```

## Security Best Practices

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use strong passwords** - Generate random passwords for production
3. **Restrict CORS origins** - Only allow trusted domains in production
4. **Rotate credentials** - Regularly update database passwords
5. **Use environment-specific configs** - Different settings for dev/prod
6. **Secure password storage** - Use secrets management in production (AWS Secrets Manager, Azure Key Vault, etc.)

## Troubleshooting

### Database Connection Issues

If you're experiencing database connection issues:

1. **Check DB_TYPE**: Ensure it matches your intended database
2. **Verify PostgreSQL is running**: `docker-compose ps` or check your PostgreSQL service
3. **Test connection**: `psql -h localhost -U finvibe_user -d finvibe`
4. **Check credentials**: Ensure DB_USER and DB_PASSWORD are correct
5. **Check host networking**: Use `localhost` for local, `postgres` for Docker

### CORS Issues

If the frontend cannot connect to the backend:

1. **Check CORS_ORIGIN**: Ensure it includes your frontend URL
2. **Check protocol**: Use `http://` for local, `https://` for production
3. **Check port**: Include the port if not using standard (80/443)
4. **Browser console**: Check for specific CORS error messages

### Port Conflicts

If ports are already in use:

1. **Change ports** in `.env`:
   ```env
   BACKEND_PORT=3001
   FRONTEND_PORT=8080
   DB_PORT=5433
   ```

2. **Find process using port**:
   ```bash
   # Linux/Mac
   lsof -i :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```
