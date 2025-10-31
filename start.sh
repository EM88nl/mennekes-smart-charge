#!/bin/bash

echo "=== Mennekes Smart Charge Startup ==="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "Building TypeScript..."
    npm run build
fi

# Start the application
echo "Starting application..."
npm start
