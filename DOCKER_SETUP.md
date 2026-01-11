# Docker Setup Guide for Smart Dairy AI

This guide will help you set up and run the Smart Dairy AI application using Docker with Ollama and Llama3.

## Prerequisites

### Required Software

1. **Docker** - Version 20.10 or higher
   ```bash
   # Check Docker version
   docker --version

   # Install Docker if not present
   # Linux: https://docs.docker.com/engine/install/
   # macOS: https://docs.docker.com/desktop/install/mac-install/
   # Windows: https://docs.docker.com/desktop/install/windows-install/
   ```

2. **Docker Compose** - Version 2.0 or higher
   ```bash
   # Check Docker Compose version
   docker-compose --version
   ```

3. **Git** - To clone the repository
   ```bash
   # Check Git version
   git --version
   ```

### Optional: NVIDIA GPU Support

If you have an NVIDIA GPU and want to use it for faster inference:

1. **NVIDIA Driver** - Version 470.x or higher
   ```bash
   nvidia-smi
   ```

2. **NVIDIA Container Toolkit**
   ```bash
   # Ubuntu/Debian
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
     sudo tee /etc/apt/sources.list.d/nvidia-docker.list

   sudo apt-get update
   sudo apt-get install -y nvidia-container-toolkit
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

## Quick Start

### 1. Clone and Navigate

```bash
# Clone the repository
git clone <repository-url>
cd smart-dairy-ai
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.docker.example .env

# Edit .env file with your preferred settings
nano .env
```

**Important Configuration Options:**

```bash
# Ollama Configuration
# Default: Using Ollama in Docker (recommended for beginners)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3

# Alternative: Using Ollama on host machine
# Uncomment these lines and comment out the defaults above
# OLLAMA_BASE_URL=http://host.docker.internal:11434
# OLLAMA_MODEL=llama3
```

### 3. Start the Application

```bash
# Build and start all services
docker-compose up -d --build

# Or to build with no cache (useful for debugging)
docker-compose build --no-cache
docker-compose up -d
```

### 4. Initialize the Database

```bash
# Run database migrations inside the app container
docker-compose exec app bun run db:push
```

### 5. Verify Services

```bash
# Check all services are running
docker-compose ps

# You should see:
# smart-dairy-ai    - running - port 3000
# smart-dairy-ollama - running - port 11434
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### 7. Verify Ollama is Working

```bash
# Check Ollama logs
docker-compose logs ollama

# Test Ollama API
curl http://localhost:11434/api/tags
```

## Advanced Setup Options

### Option 1: Ollama in Docker (Default)

**Pros:**
- Easy setup
- Everything self-contained
- Works on any system

**Cons:**
- Limited GPU access (requires nvidia-docker)
- Slower inference on CPU

**Configuration:**
```bash
# In .env file
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3
```

### Option 2: Ollama on Host Machine

**Pros:**
- Direct GPU access
- Better performance
- Easier GPU configuration

**Cons:**
- Requires host Ollama installation
- More complex networking

**Setup:**

1. Install Ollama on host:
   ```bash
   # Linux/macOS
   curl -fsSL https://ollama.com/install.sh | sh

   # Or download from https://ollama.com/download
   ```

2. Pull Llama3 model:
   ```bash
   ollama pull llama3
   ```

3. Configure Docker to use host Ollama:
   ```bash
   # In .env file
   OLLAMA_BASE_URL=http://host.docker.internal:11434
   OLLAMA_MODEL=llama3

   # For Linux, you might need:
   # OLLAMA_BASE_URL=http://172.17.0.1:11434
   ```

4. Update docker-compose.yml:
   ```yaml
   services:
     app:
       # ... existing config ...
       extra_hosts:
         - "host.docker.internal:host-gateway"

     ollama:
       # Comment out or remove the ollama service
   ```

5. Restart:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Option 3: External Ollama Server

**Pros:**
- Centralized LLM service
- Can be shared across applications
- Better resource utilization

**Cons:**
- Requires network configuration
- Security considerations

**Setup:**

```bash
# In .env file
OLLAMA_BASE_URL=http://your-ollama-server:11434
OLLAMA_MODEL=llama3
```

## GPU Acceleration

### NVIDIA GPU Setup

1. **Update docker-compose.yml:**

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    # ... existing config ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

2. **Verify GPU Access:**

```bash
# Check if GPU is accessible
docker-compose exec ollama nvidia-smi

# Test inference with GPU
docker-compose exec ollama ollama run llama3 "Hello, how are you?"
```

### Expected Performance

| Setup | Response Time | RAM Usage |
|--------|---------------|------------|
| CPU (Ollama in Docker) | 15-30s | 8-16GB |
| CPU (Host Ollama) | 10-20s | 8-16GB |
| GPU (RTX 3060) | 3-5s | 8-16GB (8GB VRAM) |
| GPU (RTX 4060) | 2-4s | 8-16GB (8GB VRAM) |

## Managing the Application

### Start Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d app
docker-compose up -d ollama
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app
docker-compose logs ollama

# Follow logs in real-time
docker-compose logs -f app
docker-compose logs -f ollama
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
docker-compose restart ollama
```

### Access Container Shell

```bash
# Access app container
docker-compose exec app sh

# Access Ollama container
docker-compose exec ollama sh
```

## Data Persistence

### Volumes

The application uses Docker volumes for data persistence:

```yaml
volumes:
  ollama-models:  # Ollama model weights
  uploads:          # Uploaded files (PDFs, CSVs)
  db:               # SQLite database
```

### Backing Up Data

```bash
# Backup database
docker cp smart-dairy-ai:/app/db ./backup/db

# Backup uploads
docker cp smart-dairy-ai:/app/uploads ./backup/uploads

# Backup Ollama models
docker cp smart-dairy-ollama:/root/.ollama ./backup/ollama
```

### Restoring Data

```bash
# Restore database
docker cp ./backup/db smart-dairy-ai:/app/

# Restore uploads
docker cp ./backup/uploads smart-dairy-ai:/app/

# Restore Ollama models
docker cp ./backup/ollama smart-dairy-ollama:/root/
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Symptom:** Container exits immediately

**Solution:**
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Port 3000 already in use
# - Database not initialized
# - Missing environment variables
```

#### 2. Ollama Not Responding

**Symptom:** Chat responses time out or fail

**Solution:**
```bash
# Check Ollama is running
docker-compose ps ollama

# Check Ollama logs
docker-compose logs ollama

# Test Ollama API directly
curl http://localhost:11434/api/tags

# If not responding, restart Ollama
docker-compose restart ollama
```

#### 3. Can't Upload Files

**Symptom:** File uploads fail or timeout

**Solution:**
```bash
# Check volume permissions
docker-compose exec app ls -la /app/uploads

# Check disk space
docker system df

# Clear unused Docker data
docker system prune -a
```

#### 4. GPU Not Detected

**Symptom:** Using CPU instead of GPU

**Solution:**
```bash
# Check NVIDIA Docker
docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi

# Verify docker-compose.yml has GPU configuration
# Check deploy.resources section

# Ensure NVIDIA Container Toolkit is installed
nvidia-container-cli --version
```

#### 5. Slow Performance

**Symptom:** Responses take 30+ seconds

**Solutions:**

1. **Use a smaller model:**
   ```bash
   # In .env
   OLLAMA_MODEL=llama3:8b  # Instead of llama3:70b
   ```

2. **Reduce context:**
   - Shorter questions
   - Fewer uploaded documents

3. **Enable GPU:**
   - Follow GPU setup instructions above

4. **Check system resources:**
   ```bash
   docker stats smart-dairy-ollama
   ```

### Debug Mode

To enable more detailed logging:

```bash
# In .env
LOG_LEVEL=debug

# Then restart
docker-compose restart app
docker-compose logs -f app
```

## Updating the Application

### Pull New Code

```bash
# Stop services
docker-compose down

# Pull latest changes
git pull origin main

# Rebuild and start
docker-compose up -d --build

# Run migrations if needed
docker-compose exec app bun run db:push
```

### Rebuild Without Cache

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Security Considerations

### Production Deployment

1. **Change Default Passwords:**
   - If using database authentication

2. **Network Isolation:**
   - Use separate networks for different services
   - Limit exposed ports

3. **HTTPS:**
   - Use reverse proxy (nginx, traefik)
   - Enable SSL/TLS

4. **Resource Limits:**
   ```yaml
   # In docker-compose.yml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 4G
   ```

5. **Regular Updates:**
   - Keep Docker images updated
   - Monitor for security advisories

### Firewall Configuration

```bash
# Only allow access to port 3000 from trusted networks
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw enable
```

## Performance Optimization

### Database Optimization

```bash
# For production, consider PostgreSQL instead of SQLite
# Update DATABASE_URL in .env:
# DATABASE_URL=postgresql://user:password@postgres:5432/smart_dairy

# Add PostgreSQL service to docker-compose.yml
```

### Caching

The application includes:
- Web search result caching (1 hour TTL)
- Query logging for analytics

### Load Balancing

For high-traffic deployments:

```yaml
# Scale application instances
docker-compose up -d --scale app=3
```

## Monitoring

### Health Checks

Services include health checks:

```bash
# Check health status
docker-compose ps

# Health check details
docker inspect smart-dairy-ai --format='{{.State.Health}}'
```

### Metrics Collection

Consider adding:
- Prometheus for metrics
- Grafana for visualization
- Log aggregation (ELK stack)

## Support

### Getting Help

1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check GitHub issues
4. Contact support team

### Useful Commands

```bash
# Container statistics
docker stats

# View running containers
docker ps

# View all containers
docker ps -a

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# System-wide cleanup
docker system prune -a --volumes
```

## Next Steps

After successful setup:

1. **Upload Documents**: Add dairy farm manuals and scientific papers
2. **Upload Farm Data**: Add CSV/Excel files from herd management
3. **Test Queries**: Ask questions to test all features
4. **Monitor Performance**: Check logs and response times
5. **Optimize**: Adjust model size and configuration based on usage

## Additional Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Llama3 Model](https://llama.meta.com/llama3)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

---

**Smart Dairy AI** - Empowering Dairy Producers with AI Intelligence
