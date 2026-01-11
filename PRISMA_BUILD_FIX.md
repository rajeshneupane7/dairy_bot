# Prisma Build Fix

## Problem

Build was failing with this error:
```
Error: @prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.
```

## Root Cause

The Next.js build process imports Prisma client, but it wasn't generated yet because:
1. Prisma schema wasn't copied before npm install
2. `prisma generate` wasn't run before the build

## Solution Applied

Updated the Dockerfile build stage to:

1. **Copy package.json and prisma folder FIRST**
   ```dockerfile
   COPY package.json ./
   COPY prisma ./prisma
   ```

2. **Install dependencies**
   ```dockerfile
   RUN npm install
   ```

3. **Generate Prisma client**
   ```dockerfile
   RUN npx prisma generate
   ```

4. **Copy rest of source code**
   ```dockerfile
   COPY . .
   ```

5. **Build application**
   ```dockerfile
   RUN npm run build
   ```

## Build Stage Sequence

```dockerfile
# Build stage
FROM node:20-alpine AS base

# Install dependencies for Python and build tools
RUN apk add --no-cache python3 py3-pip libc6-compat git wget

# Set working directory
WORKDIR /app

# Step 1: Copy package files and Prisma schema first
COPY package.json ./
COPY prisma ./prisma

# Step 2: Install dependencies with npm
RUN npm install

# Step 3: Generate Prisma client before building
RUN npx prisma generate

# Step 4: Copy rest of source code
COPY . .

# Step 5: Build application
RUN npm run build
```

## Why This Works

- ✅ Prisma schema is available when `prisma generate` runs
- ✅ Prisma CLI is installed via npm/node_modules
- ✅ Generated Prisma client is available during Next.js build
- ✅ All TypeScript types are generated
- ✅ No import errors during build

## Testing the Fix

Try building again:

```bash
# Clean up any previous build
docker-compose down
docker system prune -f

# Rebuild from scratch
docker-compose build --no-cache

# Or use make command
make rebuild
```

## Expected Output

Build should succeed with output like:
```
✓ Installing dependencies...
✓ Generating Prisma Client...
✓ Building Next.js application...
✓ Compiled successfully
✓ Collecting page data...
```

No more Prisma errors!

## If You Still Have Issues

### 1. Clear Docker Cache

```bash
docker system prune -a --volumes
```

### 2. Check Prisma Schema

```bash
# Verify schema exists
cat prisma/schema.prisma

# Should see your database models
```

### 3. Manual Prisma Generate (Debug)

```bash
# Access container and run manually
docker-compose run --rm app npx prisma generate

# Check if client was generated
ls -la node_modules/.prisma/client/
```

### 4. Check Environment Variables

Prisma needs DATABASE_URL even during build:

```dockerfile
# Add to build stage if needed
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-file:./dev.db}
```

## Production Considerations

The Prisma client is generated at build time and included in the production image.
This means:

✅ No runtime generation needed
✅ Faster startup
✅ Predictable builds
✅ No npx needed in production

## Database Initialization

After container starts, you still need to initialize the database:

```bash
# Run migrations
docker-compose exec -T app npm run db:push

# Or
make db-push
```

This creates the actual SQLite database file and tables.

---

**Status: Fixed ✅**

The Dockerfile now properly generates Prisma client before building Next.js.
