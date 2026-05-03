#!/bin/sh
# Render /etc/nginx/conf.d/app.conf from the bundled template.
#
# We substitute exactly two variables — API_UPSTREAM and RESOLVERS — so
# nginx's own $host / $remote_addr / $request_uri / $upstream variables are
# preserved verbatim through envsubst.
set -eu

: "${API_UPSTREAM:=api:8080}"

# Pull DNS resolvers out of /etc/resolv.conf at container start so nginx can
# defer upstream name lookups to request time. Bracket IPv6 addresses.
RESOLVERS=$(awk '$1=="nameserver" {print ($2 ~ ":") ? "["$2"]" : $2}' /etc/resolv.conf | tr '\n' ' ')
[ -n "$RESOLVERS" ] || RESOLVERS="127.0.0.11"

export API_UPSTREAM RESOLVERS

envsubst '${API_UPSTREAM} ${RESOLVERS}' \
  < /etc/nginx/app.conf.template \
  > /etc/nginx/conf.d/app.conf
