# Build stage
FROM node:20-alpine AS base



RUN apk add --no-cache python3 py3-pip libc6-compat wget

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir pypdf pandas

# Set working directory
WORKDIR /app

# Copy package files and Prisma schema first
COPY package.json ./
COPY prisma ./prisma

# Install dependencies with npm (comes with Node.js, more reliable)
RUN npm install

# Generate Prisma client before building
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

# Install Python, wget, and required packages
RUN apk add --no-cache python3 py3-pip libc6-compat wget



# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app && \
    chown -R nodejs:nodejs /app

# Set working directory
WORKDIR /app

# Copy built application and necessary files from base stage
COPY --from=base --chown=nodejs:nodejs /app/.next ./.next
COPY --from=base --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=nodejs:nodejs /app/public ./public
COPY --from=base --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=base --chown=nodejs:nodejs /app/src ./src
COPY --from=base --chown=nodejs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=base --chown=nodejs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=base --chown=nodejs:nodejs /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=base --chown=nodejs:nodejs /app/components.json ./components.json

# Create necessary directories
RUN mkdir -p /app/uploads/documents /app/uploads/farm-data /app/db && \
    chown -R nodejs:nodejs /app/uploads /app/db

# Switch to non-root user
USER nodejs

# Expose port 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application with npm
CMD ["npm", "start"]
