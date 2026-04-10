# Multi-stage build for production
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy nginx config template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Set default backend URL (can be overridden by environment variable)
ENV BACKEND_URL=http://backend:3000

# Create non-root user for nginx
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /etc/nginx/templates

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx (nginx will automatically process templates in /etc/nginx/templates/)
CMD ["nginx", "-g", "daemon off;"]
