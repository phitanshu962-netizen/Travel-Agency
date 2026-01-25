# Use the official Node.js 20 runtime as the base image
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Compile TypeScript files to JavaScript
RUN npx tsc src/lib/*.ts --outDir dist/src/lib --module commonjs --target ES2020 --esModuleInterop --skipLibCheck

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Start the application
CMD ["npm", "start"]
