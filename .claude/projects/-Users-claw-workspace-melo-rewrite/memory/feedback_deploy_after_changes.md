---
name: feedback_deploy_after_changes
description: Always deploy both API and web after making code changes before telling the user to test
type: feedback
---

When code changes affect what the user will see or test, deploy before presenting the work as done.

**Why:** User was told features were ready but saw an empty player because the API hadn't been redeployed — the new fields (storyText, segments) weren't in the response. Wasted their time debugging a non-issue.

**How to apply:** After making changes that touch both API and web (or either), run `./scripts/deploy-all.sh --skip-tests` (or the appropriate deploy script) before telling the user to test. Never say "it's ready" if the running production code doesn't match what was written. If deployment isn't possible, explicitly call out that a deploy is needed before they'll see the changes.
