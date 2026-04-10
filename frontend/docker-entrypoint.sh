#!/bin/sh
set -e

# Default to /api if not provided
: "${VITE_API_URL:=/api}"

# Write runtime env for SPA to consume
echo "window.__ENV = { VITE_API_URL: \"${VITE_API_URL}\" };" > /usr/share/nginx/html/env.js

exec nginx -g "daemon off;"
