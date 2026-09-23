#!/bin/sh
set -e

# Generate runtime configuration from container environment variables
cat <<EOF > /usr/share/nginx/html/config.js
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}",
  VITE_API_KEY: "${VITE_API_KEY:-}"
};
EOF

# Start nginx
exec nginx -g "daemon off;"

