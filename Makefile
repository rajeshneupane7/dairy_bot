.PHONY: help up down restart logs build db-push db-reset shell shell-ollama clean backup restore test

# Default target
help: ## Show this help message
        @echo 'Usage: make [target]'
        @echo ''
        @echo 'Available targets:'
        @awk 'BEGIN {FS = ":.*##"} { \
                if (NF >= 2) {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2} \
        } else if (/^[a-zA-Z_-]+:/) { \
                getline; \
                printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 \
        }' $(MAKEFILE_LIST)

up: ## Start all services (build if needed)
        docker-compose up -d

build: ## Build all Docker images
        docker-compose build

down: ## Stop all services
        docker-compose down

down-volumes: ## Stop all services and remove volumes (WARNING: deletes data)
        docker-compose down -v

restart: ## Restart all services
        docker-compose restart

logs: ## View logs from all services (follow mode)
        docker-compose logs -f

logs-app: ## View logs from application (follow mode)
        docker-compose logs -f app

logs-ollama: ## View logs from Ollama (follow mode)
        docker-compose logs -f ollama

ps: ## Show running containers
        docker-compose ps

db-push: ## Run database migrations
        docker-compose exec -T app npm run db:push

db-reset: ## Reset database (WARNING: deletes all data)
        docker-compose exec -T app sh -c "rm -f /app/db/*.db && npm run db:push"

shell: ## Access application container shell
        docker-compose exec app sh

shell-ollama: ## Access Ollama container shell
        docker-compose exec ollama sh

test-ollama: ## Test Ollama connection
        @echo "Testing Ollama API..."
        @curl -s http://localhost:11434/api/tags | head -20 || echo "Ollama is not responding"
        @echo ""
        @echo "Testing model inference..."
        @curl -X POST http://localhost:11434/api/generate -d '{
                "model": "llama3",
                "prompt": "Hello, how are you?",
                "stream": false
        }' | head -10

rebuild: ## Rebuild images without cache
        docker-compose build --no-cache
        docker-compose up -d

clean: ## Remove stopped containers and unused images
        docker system prune -f

clean-all: ## Remove all containers, volumes, and images (WARNING: complete reset)
        docker-compose down -v
        docker system prune -a -f --volumes

backup: ## Backup database and uploads
        @echo "Creating backup..."
        @mkdir -p ./backup
        @docker cp smart-dairy-ai:/app/db ./backup/db
        @docker cp smart-dairy-ai:/app/uploads ./backup/uploads
        @docker cp smart-dairy-ollama:/root/.ollama ./backup/ollama
        @echo "Backup created in ./backup directory"

restore: ## Restore from backup
        @echo "Restoring from backup..."
        @if [ -d "./backup/db" ]; then \
                docker cp ./backup/db smart-dairy-ai:/app/ && echo "Database restored"; \
        fi
        @if [ -d "./backup/uploads" ]; then \
                docker cp ./backup/uploads smart-dairy-ai:/app/ && echo "Uploads restored"; \
        fi
        @if [ -d "./backup/ollama" ]; then \
                docker cp ./backup/ollama smart-dairy-ollama:/root/ && echo "Ollama models restored"; \
        fi

stats: ## Show resource usage statistics
        docker stats

install-deps: ## Install Docker and Docker Compose (Linux)
        @echo "Installing Docker..."
        @curl -fsSL https://get.docker.com -o get-docker.sh
        @sudo sh get-docker.sh
        @echo ""
        @echo "Installing Docker Compose..."
        @sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        @sudo chmod +x /usr/local/bin/docker-compose
        @echo ""
        @echo "Installation complete!"

gpu-check: ## Check if GPU is available
        @echo "Checking GPU availability..."
        @if command -v nvidia-smi &> /dev/null; then \
                nvidia-smi --query-gpu=index,name,driver_version,memory.total --format=csv; \
                echo ""; \
                echo "GPU is available! Uncomment GPU configuration in docker-compose.yml"; \
        else \
                echo "No NVIDIA GPU detected. Using CPU (slower performance)."; \
        fi

quick-start: ## Quick setup and start (interactive)
        @./setup-docker.sh

env-edit: ## Edit environment configuration
        @if [ -f .env ]; then \
                $${EDITOR:-nano} .env; \
        else \
                echo "No .env file found. Copy from .env.docker.example first:"; \
                echo "cp .env.docker.example .env"; \
        fi

env-example: ## Copy environment template
        @if [ -f .env.docker.example ]; then \
                cp .env.docker.example .env && echo "Created .env from template. Edit it to configure your settings."; \
        else \
                echo ".env.docker.example not found!"; \
        fi

update: ## Pull latest changes and rebuild
        @git pull origin main || true
        @docker-compose down
        @docker-compose build
        @docker-compose up -d
        @make db-push

health: ## Check health of all services
        @echo "Checking service health..."
        @docker-compose ps
        @echo ""
        @echo "Testing application..."
        @curl -sf http://localhost:3000/ > /dev/null && echo "✓ Application is healthy" || echo "✗ Application is not responding"
        @echo "Testing Ollama..."
        @curl -sf http://localhost:11434/api/tags > /dev/null && echo "✓ Ollama is healthy" || echo "✗ Ollama is not responding"

test: ## Run basic application tests
        @echo "Testing application endpoints..."
        @curl -sf http://localhost:3000/ > /dev/null && echo "✓ Application root endpoint" || echo "✗ Application root endpoint failed"
        @curl -sf http://localhost:3000/api/chat/session -X POST > /dev/null && echo "✓ Chat session endpoint" || echo "✗ Chat session endpoint failed"
        @echo ""
        @echo "All basic tests completed!"

setup: ## First-time setup wizard
        @./setup-docker.sh
