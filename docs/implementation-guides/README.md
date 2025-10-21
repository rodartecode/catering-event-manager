# Implementation Guides

This directory contains step-by-step implementation guides for each phase of the Catering Event Manager system.

## Guide Overview

- **PHASE-2-FOUNDATIONAL.md**: Complete infrastructure setup (database, auth, tRPC, Go service) - 38 tasks, ~4-6 hours
- **PHASE-3-USER-STORY-1.md**: MVP event management implementation - 25 tasks, ~8-10 hours
- **PHASES-4-8-OVERVIEW.md**: Quick reference for remaining user stories and polish

## Usage

1. **Start with Phase 2** after completing Phase 1 setup
2. Each guide includes:
   - Complete code examples with exact file paths
   - Verification commands to test each section
   - Common troubleshooting tips
3. Follow guides sequentially within each phase
4. Test each section before moving to the next

## Prerequisites

Before starting any phase, ensure:
- Phase 1 (Setup) is complete (see tasks.md)
- PostgreSQL is running (`docker-compose up -d postgres`)
- Environment variables are configured (copy from .env.example)
- Dependencies are installed (`pnpm install`)

## Getting Help

If stuck on a task:
1. Check the verification commands in the guide
2. Review the error messages in your terminal
3. Consult the main spec files in `specs/001-event-lifecycle-management/`
4. Refer to data-model.md for database schema details
