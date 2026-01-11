# Professor Oak MCP Server
# Multi-stage build for development and production

# ============================================
# Builder stage - compile TypeScript
# ============================================
FROM node:20-alpine AS builder

# Install bash for devcontainer compatibility (Alpine uses ash by default)
RUN apk add --no-cache bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# ============================================
# Runtime stage - production image
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV DATA_PATH=/data

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs
USER nodejs

# MCP servers use stdio, so no port exposure needed
CMD ["node", "dist/index.js"]
