# Tasks: Go Deployment Automation

## 1. Prerequisites

- [x] 1.1 Create Fly.io API token with deploy permissions for `catering-scheduler-dev` app
- [x] 1.2 Add `FLY_API_TOKEN` secret to GitHub repository settings

## 2. CI Workflow Updates

- [x] 2.1 Add `deploy-go-production` job to `.github/workflows/ci.yml`
- [x] 2.2 Configure job to use `superfly/flyctl-actions/setup-flyctl@master` action
- [x] 2.3 Set job dependencies: `needs: [build, migrate]`
- [x] 2.4 Add condition: `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`
- [x] 2.5 Add deploy step with `flyctl deploy --remote-only` command
- [x] 2.6 Add health verification step with `flyctl status`

## 3. Documentation

- [x] 3.1 Update `docs/DEPLOYMENT.md` with Go service deployment info
- [x] 3.2 Add deployment troubleshooting to `TROUBLESHOOTING.md`

## 4. Verification

- [x] 4.1 Push change to main and verify CI deploys Go service
- [x] 4.2 Verify health check passes after deployment
- [x] 4.3 Confirm Go and Vercel deployments run in parallel
