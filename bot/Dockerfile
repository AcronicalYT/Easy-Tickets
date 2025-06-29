# Dockerfile for running the discord bot
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the bot runs on (if applicable)
# EXPOSE 3000

# Set the environment variable for the bot token. You can either set this here, or using your PASS environment variables.
# ENV DISCORD_BOT_TOKEN=[your_bot_token_here]

# Start the bot
CMD ["node", "index.js"]