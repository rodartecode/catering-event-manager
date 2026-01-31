#!/bin/bash

# Health Check Script for Catering Event Manager
# Checks the health of all services in the stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs (can be overridden with environment variables)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-admin}"
POSTGRES_DB="${POSTGRES_DB:-catering_events}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
SCHEDULER_URL="${SCHEDULER_URL:-http://localhost:8080}"

# Counters
PASSED=0
FAILED=0

check_service() {
    local name="$1"
    local status="$2"

    if [ "$status" = "healthy" ]; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $name - $status"
        ((FAILED++))
    fi
}

echo "================================"
echo "  Service Health Check"
echo "================================"
echo ""

# Check PostgreSQL
echo "Checking PostgreSQL..."
if command -v pg_isready &> /dev/null; then
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
        check_service "PostgreSQL ($POSTGRES_HOST:$POSTGRES_PORT)" "healthy"
    else
        check_service "PostgreSQL ($POSTGRES_HOST:$POSTGRES_PORT)" "connection failed"
    fi
elif command -v docker &> /dev/null; then
    # Try via docker if pg_isready not available
    if docker exec catering-postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &> /dev/null; then
        check_service "PostgreSQL (docker)" "healthy"
    else
        check_service "PostgreSQL (docker)" "connection failed"
    fi
else
    check_service "PostgreSQL" "pg_isready not found"
fi

# Check Next.js Web App
echo "Checking Next.js..."
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}/api/health" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        check_service "Next.js Web App ($WEB_URL)" "healthy"
    elif [ "$HTTP_STATUS" = "000" ]; then
        check_service "Next.js Web App ($WEB_URL)" "not running"
    else
        check_service "Next.js Web App ($WEB_URL)" "HTTP $HTTP_STATUS"
    fi
elif command -v wget &> /dev/null; then
    if wget -q --spider "${WEB_URL}/api/health" 2>/dev/null; then
        check_service "Next.js Web App ($WEB_URL)" "healthy"
    else
        check_service "Next.js Web App ($WEB_URL)" "not running"
    fi
else
    check_service "Next.js Web App" "curl/wget not found"
fi

# Check Go Scheduler Service
echo "Checking Go Scheduler..."
if command -v curl &> /dev/null; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SCHEDULER_URL}/api/v1/health" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        check_service "Go Scheduler ($SCHEDULER_URL)" "healthy"
    elif [ "$HTTP_STATUS" = "000" ]; then
        check_service "Go Scheduler ($SCHEDULER_URL)" "not running"
    else
        check_service "Go Scheduler ($SCHEDULER_URL)" "HTTP $HTTP_STATUS"
    fi
elif command -v wget &> /dev/null; then
    if wget -q --spider "${SCHEDULER_URL}/api/v1/health" 2>/dev/null; then
        check_service "Go Scheduler ($SCHEDULER_URL)" "healthy"
    else
        check_service "Go Scheduler ($SCHEDULER_URL)" "not running"
    fi
else
    check_service "Go Scheduler" "curl/wget not found"
fi

# Summary
echo ""
echo "================================"
echo "  Summary"
echo "================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

# Exit with failure if any checks failed
if [ "$FAILED" -gt 0 ]; then
    echo -e "${YELLOW}Some services are not healthy.${NC}"
    exit 1
else
    echo -e "${GREEN}All services are healthy!${NC}"
    exit 0
fi
