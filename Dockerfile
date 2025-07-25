# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) first for better cache
COPY package*.json ./
# If you use yarn, uncomment the next line and comment the above
# COPY yarn.lock ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Vite project (client)
RUN npm run build

# ---- Production image ----
FROM node:20-alpine AS production

WORKDIR /app

# Copy only the built output and necessary files
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the port your server runs on (change if needed)
EXPOSE 3000

# Start the server (adjust if your server entry point is different)
CMD ["node", "server/index.js"]
