#!/bin/bash

set -e

echo "Setting up Python dev environment..."

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
else
  echo "Virtual environment already exists"
fi

# Activate venv
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
if [ -f "requirements.txt" ]; then
  echo "Installing dependencies from requirements.txt..."
  pip install -r requirements.txt
else
  echo "requirements.txt not found, installing base deps..."
  pip install fastapi uvicorn[standard] python-dotenv
  pip freeze > requirements.txt
fi

echo "Development environment ready!"
echo "Run: uvicorn app.main:app --reload"
