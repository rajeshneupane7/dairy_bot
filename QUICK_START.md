# Quick Start Guide - Smart Dairy AI with Docker

Get up and running in 5 minutes!

## Prerequisites

- Docker installed
- Docker Compose installed
- 8GB+ RAM (16GB recommended for GPU)

## Quick Start (3 Steps)

### Step 1: Run Setup Script

```bash
# Make the script executable (if needed)
chmod +x setup-docker.sh

# Run the interactive setup
./setup-docker.sh
```

The script will:
- ✅ Check Docker installation
- ✅ Create configuration file
- ✅ Ask for your preferred setup
- ✅ Build and start containers
- ✅ Initialize the database

### Step 2: Access the Application

Open your browser to:
```
http://localhost:3000
```

### Step 3: Test It!

Try these sample queries:

1. **Document Q&A** (after uploading PDFs):
   ```
   "What are the best practices for dairy cow nutrition?"
   ```

2. **Web Search**:
   ```
   "What are the latest dairy farming technologies?"
   ```

3. **Farm Data Analysis** (after uploading CSV):
   ```
   "What is the average milk production per cow?"
   ```

## Using Make Commands (Optional)

If you prefer command-line tools:

```bash
# Show all available commands
make help

# Start the application
make up

# Stop the application
make down

# View logs
make logs

# Access shell
make shell

# Test Ollama connection
make test-ollama
```

## Setup Options

### Option 1: Ollama in Docker (Recommended for Beginners)

- **Easiest** setup
- Everything in one place
- Good for testing

When prompted by the setup script, select option **1**.

### Option 2: Host Ollama (Better Performance)

If you have Ollama installed on your host machine:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull Llama3 model
ollama pull llama3

# Run setup script and select option 2
./setup-docker.sh
```

### Option 3: External Ollama Server

If you have a remote Ollama server:

When prompted by the setup script, select option **3** and enter your server URL.

## Common Tasks

### Upload Documents

1. Click "Upload PDFs" in the sidebar
2. Select your dairy farm manuals or scientific papers
3. Wait for processing (may take a few minutes)

### Upload Farm Data

1. Click "Upload CSV/Excel" in the Farm Data tab
2. Select CSV or Excel files from herd management software
3. Wait for analysis

### Stop the Application

```bash
# Stop containers
make down

# Or
docker-compose down
```

### Start Again

```bash
# Start containers
make up

# Or
docker-compose up -d
```

### View Logs

```bash
# All logs
make logs

# Application logs only
make logs-app

# Ollama logs only
make logs-ollama
```

## Troubleshooting

### Application Won't Start

```bash
# Check what's running
make ps

# Check logs
make logs

# Rebuild if needed
make rebuild
```

### Slow Responses

Try these solutions:

1. **Use a smaller model** (in .env):
   ```
   OLLAMA_MODEL=llama3:8b
   ```

2. **Enable GPU** (if you have NVIDIA GPU):
   - Uncomment GPU lines in `docker-compose.yml`
   - Run `make rebuild`

3. **Reduce documents**:
   - Upload fewer PDFs at once
   - Keep document count under 10

### Check GPU Availability

```bash
make gpu-check
```

## Backup Your Data

```bash
# Create backup
make backup

# Restore from backup
make restore
```

Backups are stored in the `./backup` directory.

## Getting Help

### View All Commands

```bash
make help
```

### Check Health

```bash
make health
```

### Access Documentation

- Full Docker Setup: `DOCKER_SETUP.md`
- Application README: `SMART_DAIRY_AI_README.md`
- Ollama Documentation: https://github.com/ollama/ollama

## What's Happening Behind the Scenes?

When you run `./setup-docker.sh` or `make up`:

1. **Docker builds** the application image with all dependencies
2. **Docker Compose** starts two containers:
   - `smart-dairy-ai`: Next.js application (port 3000)
   - `smart-dairy-ollama`: LLM service (port 11434)
3. **Database** is initialized with Prisma
4. **Ollama** loads the Llama3 model
5. **Application** connects to Ollama for AI responses

## Performance Tips

### For CPU Only

- Use `llama3:8b` model (default)
- Limit document uploads to 5-10 PDFs
- Expect 15-30 second response times
- Close other applications to free RAM

### For GPU (NVIDIA)

- Enable GPU in `docker-compose.yml`
- Use `llama3:70b` for best quality
- Expect 2-5 second response times
- Ensure adequate VRAM (8GB+ recommended)

### General

- Keep uploads organized
- Clear cache periodically
- Monitor system resources with `make stats`

## Next Steps

After successful setup:

1. ✅ Upload your dairy farm documents
2. ✅ Upload herd management data files
3. ✅ Try sample queries
4. ✅ Explore different query types
5. ✅ Read full documentation for advanced features

## System Requirements

### Minimum
- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM
- 10GB free disk space

### Recommended
- Docker 24.0+
- Docker Compose 2.20+
- 16GB RAM
- NVIDIA GPU with 8GB VRAM
- 20GB free disk space

---

**Need Help?** Check `DOCKER_SETUP.md` for detailed troubleshooting.

**Smart Dairy AI** - Empowering Dairy Producers with AI Intelligence
