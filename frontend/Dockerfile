FROM node:22-slim AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

ENV BACKEND_URL=http://backend:8000

RUN apk del curl || true
RUN touch /var/run/nginx.pid && \
  chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /etc/nginx/templates /etc/nginx/conf.d /var/log/nginx

USER nginx
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
