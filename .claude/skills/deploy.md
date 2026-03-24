---
name: deploy
description: Build, test, and deploy Mello to production. Usage: /deploy [web|api|all] [--skip-tests]
user_invocable: true
---

# Deploy Skill

Deploy Mello services to production.

## Usage
- `/deploy web` — Deploy frontend to Firebase Hosting CDN
- `/deploy api` — Deploy API to Cloud Run
- `/deploy all` — Deploy everything
- `/deploy web --skip-tests` — Skip tests for fast iteration

## What to do

1. Parse the arguments to determine what to deploy (default: `all`)
2. Run the appropriate script using Bash:

```bash
./scripts/deploy-web.sh        # for web
./scripts/deploy-api.sh        # for api
./scripts/deploy-all.sh        # for all
```

3. If `--skip-tests` is passed, append it to the script command
4. Report the result to the user — show the URLs that were deployed

## Important
- Always run from the repo root `/Users/claw/workspace/melo-rewrite`
- Docker must be running for API deploys
- The scripts handle everything: tests, build, push, terraform apply, firebase deploy
- Web deploys are fast (~15s). API deploys take ~60s.
- If tests fail, the deploy is aborted. Fix the tests first.
