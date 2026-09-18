#!/usr/bin/env bash
# Fast feedback after an edit, without making every edit cost 30 seconds.
#
#   content markdown  -> npm run validate   (~1s, catches broken refs immediately)
#   .astro/.ts/.tsx   -> astro check        (~25s, so at most once a minute)
#
# Advisory only: always exits 0. A slow type check shouldn't block an edit mid-flow.
# CI and the pre-commit checklist in CLAUDE.md are the real gates.

set -uo pipefail

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0

paths="${CLAUDE_FILE_PATHS:-}"
[ -n "$paths" ] || exit 0

needs_check=0
needs_validate=0

for path in $paths; do
  case "$path" in
    *src/content/*.md) needs_validate=1 ;;
    *.astro|*.ts|*.tsx) needs_check=1 ;;
  esac
done

if [ "$needs_validate" -eq 1 ]; then
  node scripts/validate.mjs 2>&1 | grep -E "^ERROR|error\(s\)" | head -20
fi

if [ "$needs_check" -eq 1 ]; then
  stamp=".astro/.last-typecheck"
  now=$(date +%s)
  last=0
  [ -f "$stamp" ] && last=$(cat "$stamp" 2>/dev/null || echo 0)

  if [ $(( now - last )) -ge 60 ]; then
    mkdir -p .astro && echo "$now" > "$stamp"
    npx astro check 2>&1 | tail -20
  fi
fi

exit 0
