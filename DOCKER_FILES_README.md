# Docker Files Created

This document provides an overview of all Docker-related files created for the Smart Dairy AI application.

## Files Overview

### Core Docker Files

1. **Dockerfile**
   - Multi-stage build configuration
   - Installs Node.js, Bun, Python, and required packages
   - Optimized for production deployment
   - Includes health checks
   - Runs as non-root user for security

2. **docker-compose.yml**
   - Orchestrates application and Ollama services
   - Configures networking between containers
   - Sets up volume mounts for data persistence
   - Includes optional GPU support configuration
   - Health checks for both services

3. **.dockerignore**
   - Excludes unnecessary files from Docker build context
   - Reduces build time and image size
   - Excludes node_modules, .next, logs, etc.

### Configuration Files

4. **.env.docker.example**
   - Template for environment configuration
   - All configurable options documented
   - Options for different Ollama setups
   - Performance and security settings

### Setup and Helper Files

5. **setup-docker.sh**
   - Interactive setup script
   - Checks prerequisites
   - Guides through configuration options
   - Builds and starts services automatically
   - Initializes database

6. **Makefile**
   - Collection of common Docker commands
   - Easy shortcuts for daily operations
   - Includes help text for all commands
   - Backup/restore functionality

### Documentation Files

7. **DOCKER_SETUP.md**
   - Comprehensive Docker setup guide
   - Multiple setup options explained
   - Troubleshooting section
   - Performance optimization tips
   - GPU acceleration guide

8. **QUICK_START.md**
   - 5-minute quick start guide
   - Essential commands only
   - Sample queries to try
   - Common tasks explained

## Directory Structure

```
smart-dairy-ai/
├── Dockerfile                  # Build configuration
├── docker-compose.yml          # Service orchestration
├── .dockerignore              # Build exclusions
├── .env.docker.example        # Configuration template
├── setup-docker.sh            # Interactive setup script (executable)
├── Makefile                   # Command shortcuts
├── DOCKER_SETUP.md            # Full documentation
├── QUICK_START.md             # Quick start guide
├── DOCKER_FILES_README.md     # This file
├── uploads/                   # Persistent uploads
│   ├── documents/            # Uploaded PDFs
│   └── farm-data/            # Uploaded CSV/Excel
└── db/                       # Persistent database (SQLite)
```

## Usage Matrix

| User Level | Recommended Approach |
|-------------|---------------------|
| Beginner | `./setup-docker.sh` (interactive) |
| Intermediate | `make up` (quick start) |
| Advanced | `docker-compose up -d` (direct control) |
| Development | `docker-compose -f docker-compose.dev.yml up` (dev mode) |

## Common Workflows

### First-Time Setup

```bash
# Option 1: Interactive (recommended)
./setup-docker.sh

# Option 2: Manual
cp .env.docker.example .env
# Edit .env with your settings
make up
make db-push
```

### Daily Use

```bash
# Start application
make up

# View logs
make logs

# Stop when done
make down
```

### Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
make update
```

### Troubleshooting

```bash
# Check status
make ps

# View logs
make logs

# Test components
make health
make test-ollama
```

### Data Management

```bash
# Backup
make backup

# Restore
make restore

# Reset database
make db-reset
```

## Configuration Options

### Ollama Setup

**Option 1: Ollama in Docker** (default)
- Simplest setup
- Self-contained
- Easier troubleshooting

**Option 2: Ollama on Host**
- Better GPU access
- Improved performance
- Requires host setup

**Option 3: External Ollama**
- Centralized deployment
- Shared resources
- Network configuration needed

### Model Selection

Available models (configure in .env):
- `llama3` - Default (8B parameters)
- `llama3:8b` - Smaller, faster
- `llama3:70b` - Larger, slower, better quality
- Custom - Any Ollama-compatible model

### Performance Tuning

**For CPU:**
- Use 8B models
- Reduce RAG context
- Limit concurrent queries

**For GPU:**
- Use 70B models for better quality
- Enable GPU in docker-compose.yml
- Increase batch size

## Environment Variables

Key variables in `.env`:

```bash
# LLM Configuration
OLLAMA_BASE_URL=http://ollama:11434    # Ollama endpoint
OLLAMA_MODEL=llama3                   # Model to use

# Database
DATABASE_URL=file:./dev.db             # SQLite path

# Application
NODE_ENV=production                     # Environment
PORT=3000                             # Application port

# Performance
RAG_TOP_K=5                           # Document chunks to retrieve
WEB_SEARCH_CACHE_TTL=3600            # Cache duration (seconds)
```

## Security Features

1. **Non-root User**: Application runs as dedicated user
2. **Health Checks**: Both services monitored
3. **Network Isolation**: Services on separate network
4. **Volume Permissions**: Restricted access to data
5. **Resource Limits**: Can set CPU/memory limits

## GPU Support

To enable GPU acceleration:

1. Install NVIDIA Container Toolkit
2. Uncomment GPU configuration in `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: 1
             capabilities: [gpu]
   ```
3. Rebuild: `make rebuild`

## Monitoring

### Health Checks

Both services include health checks:
- Application: HTTP check on port 3000
- Ollama: API check on /api/tags

View status:
```bash
docker-compose ps
make health
```

### Logs

Application logs include:
- LLM inference requests
- Database operations
- File uploads/processing
- Error details

Ollama logs include:
- Model loading
- Inference requests
- Performance metrics

### Metrics

Collect metrics with:
```bash
# Resource usage
make stats

# Detailed container stats
docker stats smart-dairy-ai
docker stats smart-dairy-ollama
```

## Backup Strategy

### Automatic

- Volumes persist across container restarts
- Database survives container recreation

### Manual

```bash
# Full backup
make backup

# Backup specific
docker cp smart-dairy-ai:/app/db ./backup
docker cp smart-dairy-ollama:/root/.ollama ./backup
```

### Restore

```bash
# Full restore
make restore

# Restore specific
docker cp ./backup/db smart-dairy-ai:/app/
docker cp ./backup/ollama smart-dairy-ollama:/root/
```

## Troubleshooting Quick Reference

| Issue | Command |
|--------|----------|
| Containers not starting | `make ps` and `make logs` |
| Application errors | `make logs-app` |
| LLM not responding | `make test-ollama` |
| Database issues | `make db-reset` |
| Slow performance | Check GPU, reduce model size |
| Disk space issues | `make clean` |
| Complete reset | `make clean-all` |

## Integration Points

The Docker setup integrates with:

1. **Ollama API** for LLM inference
2. **SQLite** for persistent storage
3. **File system** for uploaded documents
4. **Python** for PDF and CSV processing
5. **Next.js** for web application

## Future Enhancements

Possible additions:
- Development mode docker-compose
- Production PostgreSQL service
- Monitoring stack (Prometheus/Grafana)
- Load balancer configuration
- CI/CD pipeline
- Automated backups
- Log aggregation (ELK)

## Support

For help:

1. Check relevant documentation file
2. Run `make help` for commands
3. Review logs: `make logs`
4. Check troubleshooting section in DOCKER_SETUP.md

---

**Smart Dairy AI** - Docker-Ready Agentic AI for Dairy Farming
