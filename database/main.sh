#!/bin/bash

# Make docker_setup.sh executable
chmod +x docker_setup.sh

# Run docker_setup.sh
echo "Running docker_setup.sh..."
./docker_setup.sh

# Check if docker_setup.sh ran successfully
if [ $? -eq 0 ]; then
    echo "docker_setup.sh completed successfully"
else
    echo "docker_setup.sh failed"
    exit 1
fi

# Run docker compose
echo "Running docker compose..."
sudo docker compose up -d

# Check if docker compose ran successfully
if [ $? -eq 0 ]; then
    echo "docker compose started successfully"
else
    echo "docker compose failed"
    exit 1
fi

echo "All tasks completed!"
