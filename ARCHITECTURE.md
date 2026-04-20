# FinVibe Architecture

This document describes the architecture and design decisions of the FinVibe application.

## System Overview

FinVibe is a full-stack personal finance tracker built with a modern three-tier architecture:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────▶│   Frontend   │────▶│   Backend    │────▶┌──────────────┐
│             │     │ React + Nginx│     │ Node.js/Expr │     │  PostgreSQL  │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

## Components

### Frontend (React + Vite + Nginx)

**Technology Stack:**
- React 18 - UI framework
- Vite 6 - Build tool and dev server
- React Router - Client-side routing
- Axios - HTTP client
- Recharts - Data visualization
- Nginx - Production web server and reverse proxy

**Key Features:**
- Single Page Application (SPA) with client-side routing
- Responsive design for mobile and desktop
- Real-time data visualization with charts
- File upload support for receipts and attachments

### Backend (Node.js + Express)

**Technology Stack:**
- Node.js 20 - Runtime environment
- Express 5 - Web framework
- PostgreSQL - Database
- JWT - Authentication
- Multer - File uploads
- Express Validator - Input validation

**Key Features:**
- RESTful API design
- JWT-based authentication
- Input sanitization and validation
- Rate limiting and security headers
- File upload handling
- Database migrations and seeding

### Database (PostgreSQL)

**Schema:**
- `users` - User accounts and authentication
- `accounts` - Bank accounts and credit cards
- `categories` - Income and expense categories
- `transactions` - Financial transactions with attachments
- `budgets` - Spending limits per category

## API Communication Architecture

### Overview

The frontend communicates with the backend using an **nginx reverse proxy pattern**. This approach provides:

✅ **Environment Independence** - Same build works across all environments
✅ **Security** - Backend can be internal-only
✅ **Simplicity** - No hardcoded URLs in frontend code
✅ **CORS Management** - Simplified CORS configuration

### How It Works

#### 1. Development Environment

```
Browser (localhost:5173)
    ↓
Vite Dev Server (proxy /api → http://localhost:3000)
    ↓
Backend API (localhost:3000)
```

Configuration: `frontend/vite.config.js`
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}
```

#### 2. Docker Compose Environment

```
Browser (localhost:80)
    ↓
Frontend Container (nginx:80)
    ↓ /api → http://backend:3000
Backend Container (node:3000)
    ↓
PostgreSQL Container (postgres:5432)
```

Configuration: `frontend/nginx.conf.template`
```nginx
location /api/ {
    proxy_pass ${BACKEND_URL};  # http://backend:3000
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    ...
}
```

Environment: `docker-compose.yml`
```yaml
frontend:
  environment:
    BACKEND_URL: http://backend:3000
```

### Runtime Configuration

The frontend nginx configuration uses **template substitution**:

1. Build time: `nginx.conf.template` is copied to `/etc/nginx/templates/`
2. Container startup: Nginx processes templates and substitutes `${BACKEND_URL}`
3. Runtime: Nginx serves the app and proxies `/api` requests to the backend

This allows the same Docker image to work in different environments by changing the `BACKEND_URL` environment variable.

## Security Architecture

### Authentication & Authorization

- JWT-based stateless authentication
- Tokens stored in localStorage
- Password hashing with bcryptjs

### Security Middleware

1. **Helmet** - Security headers
2. **Rate Limiting** - Prevent brute force attacks
3. **Input Sanitization** - XSS prevention
4. **CORS** - Controlled cross-origin access
5. **Express Validator** - Input validation

## Data Flow Examples

### User Registration

```
1. User fills registration form
2. Frontend validates input
3. POST /api/auth/register with user data
4. Backend validates and sanitizes input
5. Backend hashes password
6. Backend creates user in database
7. Backend generates JWT token
8. Frontend stores token and user data
9. Frontend redirects to dashboard
```

### Creating a Transaction

```
1. User fills transaction form
2. Frontend validates input
3. POST /api/transactions with transaction data
4. Backend validates and sanitizes input
5. Backend stores transaction in database
6. Backend updates account balance
7. Backend returns created transaction
8. Frontend updates UI with new data
```

## Deployment Environments

### Development (Local)
- Frontend: `npm run dev` on port 5173
- Backend: `npm run dev` on port 3000
- Database: Local PostgreSQL or Docker
- Proxy: Vite dev server

### Docker (Local/Self-hosted)
- All services containerized
- Docker Compose orchestration
- Persistent volumes for database
- Nginx serves frontend and proxies API

## Design Decisions

### Why Nginx Reverse Proxy?

**Problem:** Vite environment variables are build-time only, making it impossible to configure the backend URL at runtime without rebuilding.

**Solution:** Use nginx reverse proxy with runtime environment variable substitution.

**Benefits:**
- Single build works everywhere
- Backend can be internal-only
- No CORS issues
- Simpler configuration

### Why PostgreSQL?

- Production-grade reliability
- ACID compliance
- Rich feature set (JSON, arrays, etc.)
- Better performance for complex queries
- Wide ecosystem support

## Performance Considerations

### Frontend Optimization
- Code splitting with React.lazy
- Asset caching with nginx
- Gzip compression

### Backend Optimization
- Connection pooling for database
- Rate limiting to prevent abuse
- Efficient database queries with indexes
- Pagination for large datasets

### Database Optimization
- Indexes on frequently queried columns
- Foreign key constraints for data integrity
- Migrations for schema changes

## Future Enhancements

### Planned Features
- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Budget alerts and notifications
- [ ] Data export (CSV, PDF)
- [ ] Mobile app
- [ ] Receipt OCR scanning
- [ ] Investment tracking

### Technical Improvements
- [ ] Add Redis for session management
- [ ] Implement refresh token rotation
- [ ] Add WebSocket for real-time updates
- [ ] Improve test coverage

---

**Last Updated:** April 2026


## Components

### Frontend (React + Vite + Nginx)

**Technology Stack:**
- React 18 - UI framework
- Vite 6 - Build tool and dev server
- React Router - Client-side routing
- Axios - HTTP client
- Recharts - Data visualization
- Nginx - Production web server and reverse proxy

**Key Features:**
- Single Page Application (SPA) with client-side routing
- Responsive design for mobile and desktop
- Real-time data visualization with charts
- File upload support for receipts and attachments

### Backend (Node.js + Express)

**Technology Stack:**
- Node.js 20 - Runtime environment
- Express 5 - Web framework
- PostgreSQL - Database
- JWT - Authentication
- Multer - File uploads
- Express Validator - Input validation

**Key Features:**
- RESTful API design
- JWT-based authentication
- Input sanitization and validation
- Rate limiting and security headers
- File upload handling
- Database migrations and seeding

### Database (PostgreSQL)

**Schema:**
- `users` - User accounts and authentication
- `accounts` - Bank accounts and credit cards
- `categories` - Income and expense categories
- `transactions` - Financial transactions with attachments
- `budgets` - Spending limits per category

## API Communication Architecture

### Overview

The frontend communicates with the backend using an **nginx reverse proxy pattern**. This approach provides:

✅ **Environment Independence** - Same build works across all environments
✅ **Security** - Backend can be internal-only
✅ **Simplicity** - No hardcoded URLs in frontend code
✅ **CORS Management** - Simplified CORS configuration

### How It Works

#### 1. Development Environment

```
Browser (localhost:5173)
    ↓
Vite Dev Server (proxy /api → http://localhost:3000)
    ↓
Backend API (localhost:3000)
```

Configuration: `frontend/vite.config.js`
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}
```

#### 2. Docker Compose Environment

```
Browser (localhost:80)
    ↓
Frontend Container (nginx:80)
    ↓ /api → http://backend:3000
Backend Container (node:3000)
    ↓
PostgreSQL Container (postgres:5432)
```

Configuration: `frontend/nginx.conf.template`
```nginx
location /api/ {
    proxy_pass ${BACKEND_URL};  # http://backend:3000
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    ...
}
```

Environment: `docker-compose.yml`
```yaml
frontend:
  environment:
    BACKEND_URL: http://backend:3000
```

#### 3. Azure Container Apps Environment

```
Internet
    ↓ HTTPS
Frontend Container App (public)
    ↓ /api → https://<backend-app>.<env-default-domain>
Backend Container App (public ingress)
    ↓
PostgreSQL Container App (internal only)
```

Configuration: `infra/main.tf`
```hcl
module "frontend_container_app" {
  ...
  env = [{
    name  = "BACKEND_URL"
    value = "https://${var.backend_app_name}.${module.container_apps_environment.default_domain}"
  }]
}
```

### Runtime Configuration

The frontend nginx configuration uses **template substitution**:

1. Build time: `nginx.conf.template` is copied to `/etc/nginx/templates/`
2. Container startup: Nginx processes templates and substitutes `${BACKEND_URL}`
3. Runtime: Nginx serves the app and proxies `/api` requests to the backend

This allows the same Docker image to work in different environments by just changing the `BACKEND_URL` environment variable.
Terraform sets `BACKEND_URL` to the stable backend app FQDN so Nginx keeps routing correctly across backend revisions.

## Security Architecture

### Authentication & Authorization

- JWT-based stateless authentication
- Tokens stored in localStorage
- HTTP-only cookies for refresh tokens (future enhancement)
- Password hashing with bcryptjs

### Security Middleware

1. **Helmet** - Security headers
2. **Rate Limiting** - Prevent brute force attacks
3. **Input Sanitization** - XSS prevention
4. **CORS** - Controlled cross-origin access
5. **Express Validator** - Input validation

### Azure Security

- Managed Identities for service authentication
- OIDC for GitHub Actions (no stored credentials)
- Internal-only backend and database
- IP restrictions on frontend (configurable)
- RBAC for ACR access

## Data Flow Examples

### User Registration

```
1. User fills registration form
2. Frontend validates input
3. POST /api/auth/register with user data
4. Backend validates and sanitizes input
5. Backend hashes password
6. Backend creates user in database
7. Backend generates JWT token
8. Frontend stores token and user data
9. Frontend redirects to dashboard
```

### Creating a Transaction

```
1. User fills transaction form
2. Frontend validates input
3. POST /api/transactions with transaction data
4. Backend validates and sanitizes input
5. Backend stores transaction in database
6. Backend updates account balance
7. Backend returns created transaction
8. Frontend updates UI with new data
```

## Deployment Environments

### Development (Local)
- Frontend: `npm run dev` on port 5173
- Backend: `npm run dev` on port 3000
- Database: Local PostgreSQL or Docker
- Proxy: Vite dev server

### Docker (Local/Production)
- All services containerized
- Docker Compose orchestration
- Persistent volumes for database
- Nginx serves frontend and proxies API

### Azure Container Apps (Production)
- Infrastructure as Code with Terraform
- Automated deployments via GitHub Actions
- Auto-scaling based on HTTP traffic
- Managed PostgreSQL with Azure Files storage
- Internal networking between services

## Design Decisions

### Why Nginx Reverse Proxy?

**Problem:** Vite environment variables are build-time only. The frontend was hardcoded with `http://localhost:3000` which broke in Azure.

**Solution:** Use nginx reverse proxy with runtime environment variable substitution.

**Benefits:**
- Single build works everywhere
- Backend can be internal-only
- No CORS issues
- Simpler configuration

### Why PostgreSQL?

- Production-grade reliability
- ACID compliance
- Rich feature set (JSON, arrays, etc.)
- Better performance for complex queries
- Wide ecosystem support

### Why Container Apps over VMs?

- Auto-scaling to zero
- Pay-per-use pricing
- Simplified management
- Built-in load balancing
- Managed updates and patching

## Performance Considerations

### Frontend Optimization
- Code splitting with React.lazy
- Asset caching with nginx
- Gzip compression
- Image optimization

### Backend Optimization
- Connection pooling for database
- Rate limiting to prevent abuse
- Efficient database queries with indexes
- Pagination for large datasets

### Database Optimization
- Indexes on frequently queried columns
- Foreign key constraints for data integrity
- Migrations for schema changes
- Regular backups

## Monitoring & Observability

### Azure Application Insights
- Request tracing
- Error tracking
- Performance metrics
- Custom events

### Log Analytics
- Container logs
- System metrics
- Query capabilities
- Alerts and dashboards

## Future Enhancements

### Planned Features
- [ ] Multi-currency support
- [ ] Recurring transactions
- [ ] Budget alerts and notifications
- [ ] Data export (CSV, PDF)
- [ ] Mobile app
- [ ] Receipt OCR scanning
- [ ] Investment tracking

### Technical Improvements
- [ ] Add Redis for session management
- [ ] Implement refresh token rotation
- [ ] Add WebSocket for real-time updates
- [ ] Implement CDC for data synchronization
- [ ] Add GraphQL API option
- [ ] Improve test coverage

## References

### Documentation
- [Azure Container Apps](https://learn.microsoft.com/azure/container-apps/)
- [Azure Verified Modules](https://aka.ms/avm)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Best Practices](https://react.dev/learn)

### Code Structure
- [Backend Structure](backend/README.md)
- [Frontend Structure](frontend/README.md)
- [Infrastructure](infra/README.md)

---

**Last Updated:** April 2026
