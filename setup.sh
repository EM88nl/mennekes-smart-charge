#!/bin/bash

# Mennekes Smart Charge Setup Script
# This script helps you set up the application quickly

set -e

echo "======================================"
echo "  Mennekes Smart Charge Setup"
echo "======================================"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Check if config.json exists
if [ ! -f "config.json" ]; then
    echo "📋 Creating config.json from template..."
    if [ -f "config.example.json" ]; then
        cp config.example.json config.json
        echo "✅ config.json created. Please edit it with your settings:"
        echo "   - MQTT broker address and topic"
        echo "   - Modbus serial port"
        echo "   - Charger parameters"
        echo ""
        read -p "Press Enter to continue after editing config.json..."
    else
        echo "❌ config.example.json not found"
        exit 1
    fi
else
    echo "✅ config.json already exists"
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build
echo "✅ Project built successfully"
echo ""

# Run tests
echo "🧪 Running tests..."
if npm test; then
    echo "✅ All tests passed"
else
    echo "⚠️  Some tests failed. Please review the errors above."
fi
echo ""

# Check serial port
echo "🔍 Checking for USB-to-RS485 adapter..."
if ls /dev/serial/by-id/ 2>/dev/null | grep -q "usb"; then
    echo "✅ USB serial devices found:"
    ls -la /dev/serial/by-id/ | grep usb || true
else
    echo "⚠️  No USB serial devices found. Please connect your USB-to-RS485 adapter."
fi
echo ""

# Final instructions
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit config.json with your actual settings"
echo "2. Ensure your USB-to-RS485 adapter has proper permissions:"
echo "   sudo usermod -a -G dialout $USER"
echo "   (then log out and back in)"
echo ""
echo "3. Start the application:"
echo "   npm start"
echo ""
echo "4. Access the web interface:"
echo "   http://localhost:3000"
echo ""
echo "For more information, see README.md"
echo "======================================"
