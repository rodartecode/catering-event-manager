---
name: warn-force-push
enabled: true
event: bash
pattern: git\s+push.*--force|git\s+push.*-f\b
action: warn
---

⚠️ **Force push detected!**

You're about to run `git push --force` which is a **destructive operation**.

**Risks:**
- Overwrites remote history
- Can cause teammates to lose work
- Difficult to recover from if done on shared branches

**Before proceeding, verify:**
- [ ] This is NOT the main/master branch
- [ ] No one else is working on this branch
- [ ] You understand what commits will be overwritten

**Safer alternatives:**
- `git push --force-with-lease` - Only force pushes if remote hasn't changed
- `git push` (no force) - Will fail safely if histories diverge

Consider using `--force-with-lease` instead for safer force pushing.
