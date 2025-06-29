# Dockerfile for running the next.js web application
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the application runs on
EXPOSE 3000

# Set environment variables if needed, you can either set these here or using your PASS environment
# ENV NEXT_PUBLIC_API_URL=[your_api_url_here]

# Start the Next.js application
CMD ["npm", "start"]