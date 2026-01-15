# LifeTracker Deployment Guide

This document covers deploying LifeTracker to a production environment.

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   iOS Shortcut  │
                                    └────────┬────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Traefik                                  │
│                    (Reverse Proxy + TLS)                        │
│              lifetracker.maverickapplications.com               │
└─────────────────────┬───────────────────────┬───────────────────┘
                      │                       │
                      ▼                       ▼
              ┌───────────────┐       ┌───────────────┐
              │   API Server  │       │   Web Server  │
              │  (Fastify)    │       │   (Vite)      │
              │   Port 3000   │       │   Port 5173   │
              └───────┬───────┘       └───────────────┘
                      │
          ┌──────────┴──────────┐
          ▼                     ▼
   ┌─────────────┐      ┌─────────────┐
   │  PostgreSQL │      │   Ollama    │
   │   Port 5432 │      │ (Local LLM) │
   └─────────────┘      └─────────────┘
```

## Prerequisites

- Docker and Docker Compose
- Traefik configured with Docker provider and Let's Encrypt
- DNS A record pointing to your server
- Ollama installed on the host (for LLM processing)

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://lifetracker:YOUR_SECURE_PASSWORD@localhost:5433/lifetracker"

# API Authentication
API_KEY="YOUR_SECURE_API_KEY"  # Generate with: openssl rand -hex 32

# LLM Service
OLLAMA_URL="http://localhost:11434"

# Environment
NODE_ENV="production"
```

### Generating Secure Keys

```bash
# Generate a secure API key
openssl rand -hex 32

# Generate a secure database password
openssl rand -base64 24
```

## Deployment Steps

### 1. Clone and Configure

```bash
git clone https://github.com/your-repo/lifetracker.git
cd lifetracker

# Copy and edit environment file
cp .env.example .env
# Edit .env with production values
```

### 2. Create Traefik Network

```bash
docker network create traefik
```

### 3. Configure Traefik

Ensure your Traefik configuration includes:

```yaml
# traefik.yml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
    network: traefik

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@domain.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### 4. Start Services

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f api
```

### 5. Initialize Database

```bash
# Run migrations and seed
docker exec lifetracker-api bun run db:push
docker exec lifetracker-api bun run db:seed
```

### 6. Set Up Ollama

On your host machine:

```bash
# Install Ollama (if not installed)
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
ollama serve

# Pull the model
ollama pull gpt-oss:20b
```

### 7. Verify Deployment

```bash
# Check health endpoint
curl https://lifetracker.maverickapplications.com/health

# Expected response:
# {"status":"ok","services":{"api":"healthy","llm":"healthy"}}
```

## Docker Compose Services

| Service | Container Name | Port (External:Internal) | Purpose |
|---------|----------------|--------------------------|---------|
| postgres | lifetracker-db | 5433:5432 | PostgreSQL database |
| api | lifetracker-api | 3000 (via Traefik) | Fastify API server |
| web | lifetracker-web | 5173 (via Traefik) | Vite web server |

## Traefik Labels

The `docker-compose.yml` includes Traefik labels for automatic routing:

- **API routes:** `/api/*` and `/health` → lifetracker-api:3000
- **Web routes:** `/*` → lifetracker-web:5173
- **TLS:** Auto-provisioned via Let's Encrypt

## Monitoring and Logs

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f postgres
```

### Check Container Health

```bash
# Container status
docker compose ps

# Resource usage
docker stats lifetracker-api lifetracker-web lifetracker-db
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it lifetracker-db psql -U lifetracker -d lifetracker

# Useful queries
SELECT COUNT(*) FROM tasks;
SELECT * FROM lists;
```

## Backup and Restore

### Database Backup

```bash
# Create backup
docker exec lifetracker-db pg_dump -U lifetracker lifetracker > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_YYYYMMDD.sql | docker exec -i lifetracker-db psql -U lifetracker -d lifetracker
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * docker exec lifetracker-db pg_dump -U lifetracker lifetracker > /backups/lifetracker_$(date +\%Y\%m\%d).sql
```

## Updating

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# Run any new migrations
docker exec lifetracker-api bun run db:push
```

## Troubleshooting

### API Not Responding

```bash
# Check if container is running
docker compose ps api

# Check logs
docker compose logs api --tail 100

# Restart service
docker compose restart api
```

### Database Connection Issues

```bash
# Check PostgreSQL is healthy
docker exec lifetracker-db pg_isready -U lifetracker

# Check connection from API container
docker exec lifetracker-api nc -zv postgres 5432
```

### LLM Not Working

```bash
# Check Ollama is running on host
curl http://localhost:11434/api/tags

# Check model is loaded
ollama list

# Check API can reach Ollama
docker exec lifetracker-api curl http://host.docker.internal:11434/api/tags
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker logs traefik --tail 100

# Verify DNS is pointing correctly
dig lifetracker.maverickapplications.com

# Check certificate
echo | openssl s_client -servername lifetracker.maverickapplications.com -connect lifetracker.maverickapplications.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Security Considerations

1. **API Key:** Use a strong, randomly generated API key
2. **Database Password:** Use a strong password, not the development default
3. **HTTPS:** Always use HTTPS in production (Traefik handles this)
4. **Firewall:** Only expose ports 80/443 externally
5. **Updates:** Keep Docker images and dependencies updated
6. **Backups:** Implement regular automated backups

## Performance Tuning

### PostgreSQL

For production workloads, consider adjusting PostgreSQL settings in `docker-compose.yml`:

```yaml
postgres:
  command:
    - "postgres"
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "max_connections=100"
```

### Ollama

For faster LLM responses:
- Use a GPU if available (uncomment GPU config in docker-compose)
- Consider a smaller model for lower latency
- Keep the model loaded by sending periodic requests

## Support

- **Issues:** https://github.com/your-repo/lifetracker/issues
- **Documentation:** See `docs/` directory
