# Stage 1: Build frontend assets
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy all source code
COPY . .

# Build the client (Vite) and server bundle
RUN npm run build

# Stage 2: Production image
FROM node:20-slim

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built files and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/public ./client/public
COPY --from=builder /app/uploads ./uploads
COPY --from=builder /app/.env ./.env

# Expose the port
EXPOSE 5002

# Set environment variables (override in docker-compose or at runtime)
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
