#!/bin/sh
set -e
# Validate required environment variables before substitution
[ -z "$API_PORT" ] && echo "ERROR: API_PORT is required" >&2 && exit 1
# Substitute only $API_PORT in the nginx template; leave Nginx variables intact
envsubst '$API_PORT' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
