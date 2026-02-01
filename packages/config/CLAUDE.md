# CLAUDE.md - Shared Configuration Package

Shared configuration files for the catering event manager monorepo.

## Package Overview

This package contains shared configuration for tooling across the monorepo:

```
packages/config/
├── typescript-config/     # Shared TypeScript compiler options
│   ├── base.json         # Base config (ES2022, strict mode)
│   └── package.json
├── eslint-config/        # (placeholder - ESLint configs live in apps)
└── tailwind-config/      # (placeholder - Tailwind configs live in apps)
```

## TypeScript Configuration

### Base Configuration (`typescript-config/base.json`)

Shared compiler options used across all TypeScript packages:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true
  }
}
```

### Usage in Apps/Packages

Extend the base configuration in each package's `tsconfig.json`:

```json
{
  "extends": "@catering-event-manager/typescript-config/base.json",
  "compilerOptions": {
    // Package-specific overrides
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Key Compiler Options

| Option | Value | Purpose |
|--------|-------|---------|
| `target` | ES2022 | Modern JavaScript features |
| `moduleResolution` | bundler | Optimized for bundlers (Next.js, Vite) |
| `strict` | true | Full type safety enforcement |
| `isolatedModules` | true | Required for transpilers (SWC, esbuild) |
| `noEmit` | true | Types only, no JS output (bundler handles) |

## ESLint Configuration

ESLint v9 flat config is defined per-app rather than shared, due to framework-specific needs.

**Location**: `apps/web/eslint.config.mjs`

**Key rules**:
- TypeScript-ESLint recommended rules
- Next.js plugin with Core Web Vitals
- `no-console: warn` - Use `@/lib/logger` instead
- Unused vars allowed with `_` prefix

```bash
# Run ESLint
pnpm lint
```

## Biome Configuration

Root-level Biome config (`biome.json`) handles formatting across the monorepo.

**Formatting rules**:
- 2 spaces indentation
- Single quotes (JS), double quotes (JSX)
- 100 character line width
- Trailing commas (ES5 style)
- Always use semicolons

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

## Tailwind CSS Configuration

Tailwind v4 config is defined per-app due to content path requirements.

**Location**: `apps/web/tailwind.config.ts`

**Custom theme extensions**:
- CSS variable-based colors (`--background`, `--foreground`)
- Extends default Tailwind palette

## Adding New Configurations

### Adding a Shared ESLint Config

If shared rules are needed in the future:

1. Create `packages/config/eslint-config/index.mjs`
2. Export shared rule configurations
3. Import and spread in app-level configs

### Adding a Shared Tailwind Preset

If shared design tokens are needed:

1. Create `packages/config/tailwind-config/preset.ts`
2. Export a Tailwind preset with shared theme values
3. Use `presets: [require('@catering-event-manager/tailwind-config')]`

## Troubleshooting

### TypeScript Path Resolution

If imports from `@catering-event-manager/*` aren't resolving:

```bash
# Ensure packages are linked
pnpm install

# Check TypeScript sees the paths
cd apps/web && pnpm type-check
```

### ESLint/Biome Conflicts

Biome and ESLint handle different concerns:
- **Biome**: Formatting only
- **ESLint**: Code quality rules

If conflicts occur, check both configs for overlapping rules.
