# CLAUDE.md - Shared Configuration Package

Shared configuration files for tooling across the monorepo.

## Package Structure

```
packages/config/
├── typescript-config/     # Shared TypeScript options
│   ├── base.json         # Base config (ES2022, strict)
│   └── package.json
└── tailwind-config/      # (placeholder - Tailwind in apps)
```

## TypeScript Configuration

### Base Config (`typescript-config/base.json`)

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

### Usage in Packages

```json
{
  "extends": "@catering-event-manager/typescript-config/base.json",
  "compilerOptions": {
    // Package-specific overrides
  }
}
```

### Key Options

| Option | Value | Purpose |
|--------|-------|---------|
| `target` | ES2022 | Modern JavaScript |
| `moduleResolution` | bundler | For Next.js, Vite |
| `strict` | true | Full type safety |
| `isolatedModules` | true | For SWC, esbuild |

## Biome Configuration

Root-level `biome.json` handles both linting and formatting:

**Linting** (recommended rules + custom):
- `noExplicitAny`: warn
- `noUnusedVariables`: warn (ignores `_` prefix)
- `noConsole`: warn (use `@/lib/logger`)
- `noUnusedImports`: warn

**Formatting**:
- 2 spaces indentation
- Single quotes (JS), double quotes (JSX)
- 100 character line width
- Trailing commas (ES5)
- Always use semicolons

```bash
pnpm lint          # Biome linting
pnpm format        # Format code
pnpm format:check  # Check formatting
```

## Tailwind CSS

Tailwind v4 config per-app (content paths specific):

**Location**: `apps/web/tailwind.config.ts`

## Adding Shared Configurations

### Shared Tailwind Preset (future)

```typescript
// packages/config/tailwind-config/preset.ts
export default {
  theme: {
    colors: {
      // Shared design tokens
    }
  }
};
```

## Troubleshooting

### Path Resolution Issues

```bash
pnpm install  # Ensure packages linked
cd apps/web && pnpm type-check
```

### Biome Issues

Biome handles both linting and formatting. If rules conflict, check `biome.json` at the repo root.

## Related Documentation

- **Project Root**: `../../CLAUDE.md`
- **Next.js App**: `../../apps/web/CLAUDE.md`
