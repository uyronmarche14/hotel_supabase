#!/bin/bash

# Hotel Supabase Backend Setup Script

echo "Setting up Hotel Supabase Backend..."

# Create .env file from example if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from .env.example..."
  cp .env.example .env
  echo "Please update your .env file with your Supabase credentials."
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo "Setup complete! You can now start the server with:"
echo "npm run dev"
