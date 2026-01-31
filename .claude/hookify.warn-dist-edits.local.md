---
name: warn-dist-edits
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: (^|/)dist/|(^|/)build/|(^|/)\.next/|(^|/)node_modules/
action: warn
---

⚠️ **Editing generated/vendor files!**

You're about to edit a file in a generated or vendor directory:
- `dist/` - Build output
- `build/` - Build output
- `.next/` - Next.js build cache
- `node_modules/` - Dependencies

**Why this is problematic:**
- Changes will be **overwritten** on next build
- These files are typically in `.gitignore`
- Edits here don't persist and cause confusion

**Instead, edit the source files:**
- For `dist/` or `build/`: Edit files in `src/`
- For `.next/`: Edit files in `src/app/` or `src/pages/`
- For `node_modules/`: Create a patch or fork the package

Please locate and edit the source file instead.
