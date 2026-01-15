#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting LifeTracker development environment...${NC}"

# Get the script's directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check for required tools
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed${NC}"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: bun is not installed${NC}"
    echo "Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Start PostgreSQL
echo -e "${YELLOW}Starting PostgreSQL...${NC}"
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
until docker exec lifetracker-db pg_isready -U lifetracker > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}PostgreSQL is ready!${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    bun install
fi

# Setup database
echo -e "${YELLOW}Setting up database...${NC}"
cd packages/core
bun run db:generate
bun run db:push
bun run db:seed 2>/dev/null || echo "Seed already applied or skipped"
cd "$PROJECT_ROOT"

# Check if Ollama is running locally (not in Docker for this project)
echo -e "${YELLOW}Checking Ollama LLM service...${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}Ollama is running${NC}"

    # Check for gpt-oss model
    if curl -s http://localhost:11434/api/tags | grep -q "gpt-oss"; then
        echo -e "${GREEN}gpt-oss model is available${NC}"
    else
        echo -e "${YELLOW}Warning: gpt-oss model not found. LLM parsing will use fallback.${NC}"
        echo "To install: ollama pull gpt-oss:20b"
    fi
else
    echo -e "${YELLOW}Warning: Ollama not running. LLM parsing will use fallback.${NC}"
    echo "To start Ollama: ollama serve"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $API_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    echo -e "${GREEN}Goodbye!${NC}"
}
trap cleanup EXIT INT TERM

# Start API server
echo -e "${YELLOW}Starting API server on port 3000...${NC}"
cd packages/api
bun run dev &
API_PID=$!
cd "$PROJECT_ROOT"

# Wait for API to be ready
sleep 2
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}API server is ready!${NC}"

# Start web server
echo -e "${YELLOW}Starting web server on port 5173...${NC}"
cd packages/web
bun run dev &
WEB_PID=$!
cd "$PROJECT_ROOT"

# Wait for web to be ready
sleep 2
until curl -s http://localhost:5173 > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}Web server is ready!${NC}"

# Print status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}LifeTracker is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  API:     ${YELLOW}http://localhost:3000${NC}"
echo -e "  Web:     ${YELLOW}http://localhost:5173${NC}"
echo -e "  Health:  ${YELLOW}http://localhost:3000/health${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop all services"
echo ""

# Keep the script running
wait
