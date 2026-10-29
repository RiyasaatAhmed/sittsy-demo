#!/usr/bin/env bash
# One command that decides "is the project healthy?".
# Runs the project's type checks, lint rules, tests, and production builds.
set -euo pipefail

# Before the project is scaffolded there is nothing to check yet.
if [ ! -f package.json ]; then
  echo "check.sh: no package.json yet - scaffold the project first." >&2
  exit 1
fi

# Each step runs across every npm workspace (packages/*, apps/*).
echo "== typecheck =="
npm run typecheck

echo "== lint =="
npm run lint

echo "== tests =="
npx vitest run

echo "== build =="
npm run build

echo "check.sh: ALL CHECKS PASSED"
