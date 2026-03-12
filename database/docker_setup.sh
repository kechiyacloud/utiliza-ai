#!/bin/bash

#  "chmod +x Docker_ubuntu_setup.sh"
set -e
# 1. Update package index
sudo apt update -y

# 2. Install dependencies

sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# 4. Add Docker Repository

sudo add-apt-repository -y "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"

# 5. Check policy (Optional, just prints info)

apt-cache policy docker-ce

# 6. Install Docker

sudo apt install -y docker-ce

# 7. Check Status

sudo systemctl status docker --no-pager