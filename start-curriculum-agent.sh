#!/bin/bash

# Script to start the curriculum agent service
echo "🚀 Starting Language Learning Curriculum Agent..."

# Check if curriculum_agent directory exists
if [ ! -d "curriculum_agent" ]; then
    echo "❌ Error: curriculum_agent directory not found!"
    exit 1
fi

# Navigate to curriculum agent directory
cd curriculum_agent

# Check if virtual environment exists, create if not
if [ ! -d "curriculum_env" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv curriculum_env
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source curriculum_env/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your GOOGLE_API_KEY:"
    echo "GOOGLE_API_KEY=your_api_key_here"
    echo ""
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
    echo "You can create the .env file by running:"
    echo "echo 'GOOGLE_API_KEY=your_actual_api_key' > curriculum_agent/.env"
    echo ""
    echo "Continuing without API key (will use fallback curriculum)..."
fi

# Start the API server
echo "🌟 Starting curriculum agent API server..."
echo "API will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python api.py 