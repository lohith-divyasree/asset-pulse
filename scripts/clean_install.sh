# 1. Purge node_modules, .expo caches, and pnpm-lock.yaml
rm -rf node_modules apps/mobile/node_modules apps/mobile/.expo apps/web/node_modules pnpm-lock.yaml

# 2. Fresh installation
pnpm install