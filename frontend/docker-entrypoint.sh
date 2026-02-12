#!/bin/sh
set -e

# Runtime environment variable injection for Supabase config.
# Replaces build-time placeholders in JS bundles with actual values.
# If env vars are not set, placeholders are replaced with empty strings (LAN mode).

JS_DIR="/usr/share/nginx/html/assets"

if [ -d "$JS_DIR" ]; then
  # Replace Supabase URL placeholder
  find "$JS_DIR" -name '*.js' -exec sed -i \
    "s|__SUPABASE_URL_PLACEHOLDER__|${VITE_SUPABASE_URL:-}|g" {} +

  # Replace Supabase Anon Key placeholder
  find "$JS_DIR" -name '*.js' -exec sed -i \
    "s|__SUPABASE_ANON_KEY_PLACEHOLDER__|${VITE_SUPABASE_ANON_KEY:-}|g" {} +
fi

exec nginx -g 'daemon off;'
