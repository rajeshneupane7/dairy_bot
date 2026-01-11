# Quick Docker Build Instructions

## Build and Run Smart Dairy AI

The Dockerfile has been fixed to use npm instead of bun (more reliable).

### Option 1: Using Docker Compose (Recommended)

```bash
# 1. Copy environment template
cp .env.docker.example .env

# 2. Build and start all services
docker-compose up -d --build

# 3. Initialize database
docker-compose exec -T app npm run db:push

# 4. Access the application
# Open http://localhost:3000 in your browser
```

### Option 2: Using Setup Script

```bash
# Make script executable
chmod +x setup-docker.sh

# Run interactive setup
./setup-docker.sh
```

### Option 3: Using Make

```bash
# Build and start
make up

# Initialize database
make db-push

# Check logs
make logs
```

## What Was Fixed

**Problem:** The bun installation was failing because curl wasn't available.

**Solution:**
- ✅ Switched to npm (comes with Node.js, no installation needed)
- ✅ Removed bun installation steps
- ✅ Updated Dockerfile to use npm install
- ✅ Updated docker-compose.yml (no changes needed)
- ✅ Updated Makefile to use npm
- ✅ Updated setup script to use npm

## Build Time

The build may take 5-15 minutes depending on your internet connection:
- ~2-3 minutes: Download Node.js and Alpine packages
- ~3-5 minutes: Installing npm dependencies
- ~2-5 minutes: Building Next.js application
- ~1-2 minutes: Installing Python packages

## After Build

Once the build completes and services start:

1. **Check services are running:**
   ```bash
   docker-compose ps
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Access application:**
   ```
   http://localhost:3000
   ```

4. **Test Ollama:**
   ```bash
   make test-ollama
   ```

## Troubleshooting

### Build Still Fails?

1. **Check Docker is running:**
   ```bash
   docker --version
   docker ps
   ```

2. **Free up disk space:**
   ```bash
   docker system prune -f
   ```

3. **Build without cache:**
   ```bash
   docker-compose build --no-cache
   ```

4. **Check for port conflicts:**
   ```bash
   # Check if ports 3000 or 11434 are in use
   netstat -tuln | grep -E ':(3000|11434)'
   ```

### Services Not Starting?

1. **Check logs:**
   ```bash
   docker-compose logs app
   docker-compose logs ollama
   ```

2. **Restart services:**
   ```bash
   docker-compose restart
   ```

3. **Check environment variables:**
   ```bash
   docker-compose config
   ```

## Quick Commands Reference

```bash
# Start everything
make up

# Stop everything
make down

# View logs
make logs

# Restart
make restart

# Database
make db-push

# Shell access
make shell

# Health check
make health

# Backup
make backup

# Clean up
make clean
```

## Success Indicators

You'll know everything is working when:

✅ Docker containers show as "Up" in `docker-compose ps`
✅ Accessing http://localhost:3000 shows the application
✅ `curl http://localhost:11434/api/tags` returns Ollama models
✅ `make test-ollama` shows a successful response
✅ Application loads without errors in browser console

---

**Need More Help?**
- Full documentation: DOCKER_SETUP.md
- Quick start: QUICK_START.md
- Docker files overview: DOCKER_FILES_README.md

**Smart Dairy AI** - Fixed and Ready to Dockerize! 🐳✅
