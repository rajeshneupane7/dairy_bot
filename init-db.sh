#!/bin/bash

# Database Initialization Script for Smart Dairy AI
# This script ensures the database is properly initialized

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Database Initialization"
echo "========================================="
echo ""

# Check if we're inside Docker container
if [ -f /.dockerenv ]; then
    echo -e "${YELLOW}Running inside Docker container${NC}"
    IN_DOCKER=true
else
    echo -e "${YELLOW}Running from host machine${NC}"
    IN_DOCKER=false
fi

# Check if app container is running
echo -e "${YELLOW}Checking if app container is running...${NC}"
if docker-compose ps | grep -q "smart-dairy-ai.*Up"; then
    echo -e "${GREEN}✓ App container is running${NC}"
else
    echo -e "${RED}✗ App container is not running!${NC}"
    echo ""
    echo "Please start the application first:"
    echo "  docker-compose up -d"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Checking database directory...${NC}"

if [ "$IN_DOCKER" = true ]; then
    # Inside container
    if [ -d /app/db ]; then
        echo -e "${GREEN}✓ Database directory exists${NC}"
        ls -la /app/db
    else
        echo -e "${YELLOW}Creating database directory...${NC}"
        mkdir -p /app/db
    fi
else
    # On host machine
    if [ -d ./db ]; then
        echo -e "${GREEN}✓ Database directory exists${NC}"
        ls -la ./db
    else
        echo -e "${YELLOW}Creating database directory...${NC}"
        mkdir -p ./db
    fi
fi

echo ""
echo -e "${YELLOW}Step 2: Checking for existing database...${NC}"

if [ "$IN_DOCKER" = true ]; then
    if [ -f /app/db/dev.db ] || [ -f /app/db/*.db ]; then
        echo -e "${GREEN}✓ Existing database found${NC}"
        HAS_DB=true
    else
        echo -e "${YELLOW}No database found, will create new one${NC}"
        HAS_DB=false
    fi
else
    if [ -f ./db/dev.db ] || [ -f ./db/*.db ]; then
        echo -e "${GREEN}✓ Existing database found${NC}"
        HAS_DB=true
    else
        echo -e "${YELLOW}No database found, will create new one${NC}"
        HAS_DB=false
    fi
fi

echo ""
echo -e "${YELLOW}Step 3: Running Prisma schema push...${NC}"

if [ "$IN_DOCKER" = true ]; then
    echo "Running: docker-compose exec -T app npm run db:push"
    docker-compose exec -T app npm run db:push
else
    echo "Running: npm run db:push"
    npm run db:push
fi

DB_PUSH_EXIT=$?

echo ""
echo -e "${YELLOW}Step 4: Verifying database was created...${NC}"

if [ "$DB_PUSH_EXIT" -eq 0 ]; then
    echo -e "${GREEN}✓ Database push successful${NC}"
else
    echo -e "${RED}✗ Database push failed with exit code $DB_PUSH_EXIT${NC}"
    echo ""
    echo "Checking error logs..."
    if [ "$IN_DOCKER" = true ]; then
        docker-compose logs --tail=50 app
    else
        cat dev.log | tail -50
    fi
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Verifying tables were created...${NC}"

if [ "$IN_DOCKER" = true ]; then
    echo "Checking database tables..."
    docker-compose exec -T app sh -c "ls -lh /app/db/" 2>/dev/null || echo 'No db files found'"

    # Try to list tables using sqlite3 if available
    docker-compose exec -T app sh -c "if command -v sqlite3 &>/dev/null; then sqlite3 /app/db/dev.db '.tables'; else echo 'sqlite3 not available'; fi"
else
    echo "Checking database tables..."
    ls -lh ./db/ 2>/dev/null || echo "No db files found"

    # Try to list tables using sqlite3 if available
    if command -v sqlite3 &>/dev/null; then
        sqlite3 ./db/dev.db '.tables' 2>/dev/null || echo "Could not read database"
    else
        echo "sqlite3 not available, skipping table verification"
    fi
fi

echo ""
echo "========================================="
echo -e "${GREEN}Database initialization complete!${NC}"
echo "========================================="
echo ""
echo "You can now:"
echo "  1. Access the application at http://localhost:3000"
echo "  2. Upload PDF documents"
echo "  3. Upload CSV/Excel farm data files"
echo "  4. Start chatting!"
echo ""