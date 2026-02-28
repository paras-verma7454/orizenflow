#!/bin/sh
set -e

# Block nginx from auto-generating default configs
rm -f /etc/nginx/conf.d/default.conf~
touch /etc/nginx/conf.d/.placeholder

# Run original entrypoint but skip auto-config generation
/docker-entrypoint.sh /bin/sh -c 'exec nginx -g "daemon off;"'
