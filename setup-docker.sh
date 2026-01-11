#!/bin/bash

# Smart Dairy AI - Docker Setup Script
# This script helps you set up and run the application with Docker and Ollama

set -e  # Exit on error

echo "=================================="
echo "Smart Dairy AI - Docker Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
echo -n "${YELLOW}Checking Docker installation...${NC} "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is installed${NC}"
    docker --version
else
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo ""

# Check if Docker Compose is installed
echo -n "${YELLOW}Checking Docker Compose installation...${NC} "
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose is installed${NC}"
    docker-compose --version
else
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    if [ -f .env.docker.example ]; then
        cp .env.docker.example .env
        echo -e "${GREEN}✓ Created .env file from template${NC}"
        echo ""
        echo "${YELLOW}Please edit .env file to configure your settings, then run this script again.${NC}"
        echo "Key settings to review:"
        echo "  - OLLAMA_BASE_URL (default: http://ollama:11434)"
        echo "  - OLLAMA_MODEL (default: llama3)"
        echo ""
        echo "Press Enter to open .env for editing, or Ctrl+C to exit"
        read
        ${EDITOR:-nano} .env
    else
        echo -e "${RED}✗ .env.docker.example not found${NC}"
        exit 1
    fi
    exit 0
fi

echo -e "${GREEN}✓ Configuration file found${NC}"
echo ""

# Ask for setup option
echo "Choose setup option:"
echo "  1) Quick Start (Ollama in Docker - recommended for beginners)"
echo "  2) Host Ollama (if you have Ollama installed on host)"
echo "  3) Custom Ollama URL (external Ollama server)"
echo ""
read -p "Enter option [1-3] (default: 1): " option
option=${option:-1}

case $option in
    1)
        echo ""
        echo -e "${GREEN}Using Ollama in Docker${NC}"
        sed -i.bak 's|OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://ollama:11434|' .env && rm -f .env.bak
        ;;
    2)
        echo ""
        echo -e "${GREEN}Using Ollama on host machine${NC}"
        sed -i.bak 's|OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://host.docker.internal:11434|' .env && rm -f .env.bak
        echo ""
        echo -e "${YELLOW}Make sure Ollama is running on your host machine${NC}"
        echo "Start it with: ollama serve"
        ;;
    3)
        echo ""
        echo -e "${GREEN}Using custom Ollama URL${NC}"
        read -p "Enter Ollama URL (e.g., http://192.168.1.100:11434): " ollama_url
        sed -i.bak "s|OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=$ollama_url|" .env && rm -f .env.bak
        ;;
esac

# Ask for model
echo ""
echo "Available Llama3 models:"
echo "  - llama3 (default, 8B parameters)"
echo "  - llama3:70b (70B parameters, requires more RAM/GPU)"
echo ""
read -p "Enter model name (default: llama3): " model
model=${model:-llama3}

sed -i.bak "s|OLLAMA_MODEL=.*|OLLAMA_MODEL=$model|" .env && rm -f .env.bak

echo ""
echo "=================================="
echo "Configuration Summary"
echo "=================================="
grep "OLLAMA_" .env | sed 's/OLLAMA_/  /'
echo ""

# Confirm before starting
read -p "Start application with these settings? [Y/n]: " confirm
confirm=${confirm:-Y}

if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Setup cancelled. Edit .env to change settings and run this script again."
    exit 0
fi

# Build and start containers
echo ""
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose build

echo ""
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✓ Containers started${NC}"
echo ""

# Wait for services to be healthy
echo "Waiting for services to be ready..."
sleep 10

# Check service status
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ All services are running${NC}"
    echo ""
    echo "Service Status:"
    docker-compose ps
    echo ""
    echo "=================================="
    echo "Access Information"
    echo "=================================="
    echo -e "Application: ${GREEN}http://localhost:3000${NC}"
    echo -e "Ollama API:  ${GREEN}http://localhost:11434${NC}"
    echo ""
    echo "Useful Commands:"
    echo "  - View logs:        docker-compose logs -f"
    echo "  - Stop services:     docker-compose down"
    echo "  - Restart services:  docker-compose restart"
    echo "  - Shell access:      docker-compose exec app sh"
    echo ""
    echo -e "${YELLOW}Running database initialization...${NC}"
    docker-compose exec -T app npm run db:push || echo "Database already initialized or initialization failed (check logs)"
    echo ""
    echo -e "${GREEN}Setup complete! Access the application at http://localhost:3000${NC}"
else
    echo -e "${RED}✗ Some services failed to start${NC}"
    echo ""
    echo "Check logs for details:"
    echo "  docker-compose logs"
    exit 1
fi
