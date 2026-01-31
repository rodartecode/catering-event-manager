---
name: warn-npm-usage
enabled: true
event: bash
pattern: \bnpm\s+(install|i|add|ci|update|uninstall|remove|rm)
action: warn
---

⚠️ **npm command detected!**

This project uses **pnpm** as its package manager, not npm.

**Why this matters:**
- Using npm will create a `package-lock.json` that conflicts with `pnpm-lock.yaml`
- Dependency resolution may differ between package managers
- Monorepo workspace features require pnpm

**Use instead:**
| npm command | pnpm equivalent |
|-------------|-----------------|
| `npm install` | `pnpm install` |
| `npm add <pkg>` | `pnpm add <pkg>` |
| `npm run <script>` | `pnpm <script>` |
| `npm ci` | `pnpm install --frozen-lockfile` |

Please use the pnpm equivalent command.
