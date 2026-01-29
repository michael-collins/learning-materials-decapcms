# Husky Git Hooks Configuration

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Available Hooks

### pre-commit
Validates that you're not accidentally editing archived version snapshot files.

- Checks for modifications to `v*.md` files
- Prompts for confirmation before allowing commit
- Prevents accidental changes to immutable content

## Setup

Install hooks:
```bash
npm install
npx husky install
```

## Bypass (Emergency Only)

If you need to bypass the hook for a legitimate reason:
```bash
git commit --no-verify -m "your message"
```

**Warning**: Only bypass if you're intentionally editing an archived version (e.g., critical security fix).
