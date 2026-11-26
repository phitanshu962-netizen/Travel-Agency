# Use the official Node.js 20 runtime as the base image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy the rest of the application code (including pre-built .next)
COPY . .

# Run build only if .next was not copied
RUN if [ ! -d ".next" ]; then npm run build; fi

# Compile TypeScript files to JavaScript
RUN npx tsc src/lib/*.ts --outDir dist/src/lib --module commonjs --target ES2020 --esModuleInterop --skipLibCheck || true

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Create a non-root user (Debian syntax)
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -s /bin/sh nextjs

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["npm", "start"]
